// Run with: npx tsx --test tools/check-boot-readiness.ts
import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { waitForInitialAppReady } from "../src/bootReadiness";

function browserClock(context: TestContext, mockTimers = true) {
  if (mockTimers) context.mock.timers.enable({ apis: ["setTimeout"] });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const frames = new Map<number, FrameRequestCallback>();
  const timers = new Set<number>();
  let nextFrame = 0;
  const browser = {
    requestAnimationFrame(callback: FrameRequestCallback) {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame(id: number) { frames.delete(id); },
    setTimeout(callback: () => void, delay: number) {
      const id = setTimeout(() => { timers.delete(id); callback(); }, delay) as unknown as number;
      timers.add(id);
      return id;
    },
    clearTimeout(id: number) { timers.delete(id); clearTimeout(id); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  context.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  return {
    frames, timers,
    paint() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(0));
    },
    advance(ms: number) { context.mock.timers.tick(ms); },
  };
}

test("a prepared page retains a short opening instead of flashing the loader", async (context) => {
  const clock = browserClock(context);
  let ready = false;
  const readiness = waitForInitialAppReady({} as HTMLElement, undefined, Promise.resolve())
    .then(() => { ready = true; });
  clock.paint();
  clock.paint();
  await Promise.resolve();
  clock.advance(699);
  await Promise.resolve();
  assert.equal(ready, false, "fast cache hits still leave time for the opening");
  clock.advance(1);
  await readiness;
  assert.equal(ready, true);
  assert.equal(clock.frames.size + clock.timers.size, 0, "completion releases scheduled work");
});

test("resources may finish after the minimum opening and before the deadline", async (context) => {
  const clock = browserClock(context);
  let finishPreparation!: () => void;
  const preparation = new Promise<void>((resolve) => { finishPreparation = resolve; });
  let ready = false;
  const readiness = waitForInitialAppReady({} as HTMLElement, undefined, preparation)
    .then(() => { ready = true; });
  clock.paint();
  clock.paint();
  clock.advance(1100);
  await Promise.resolve();
  assert.equal(ready, false, "preparation gets a bounded chance to finish");
  finishPreparation();
  await readiness;
  assert.equal(ready, true);
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("stalled preparation releases the loader at the resource deadline", async (context) => {
  const clock = browserClock(context);
  let ready = false;
  const readiness = waitForInitialAppReady({} as HTMLElement, undefined, new Promise(() => {}))
    .then(() => { ready = true; });
  clock.paint();
  clock.paint();
  clock.advance(1799);
  await Promise.resolve();
  assert.equal(ready, false);
  clock.advance(1);
  await readiness;
  assert.equal(ready, true);
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("failed preparation still shows the page after the minimum opening", async (context) => {
  const clock = browserClock(context);
  const readiness = waitForInitialAppReady(
    {} as HTMLElement, undefined, Promise.reject(new Error("image unavailable")),
  );
  clock.paint();
  clock.paint();
  await Promise.resolve();
  clock.advance(700);
  await readiness;
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("a committed page gets paint frames even after the minimum opening", async (context) => {
  const clock = browserClock(context);
  let ready = false;
  const readiness = waitForInitialAppReady({} as HTMLElement).then(() => { ready = true; });
  clock.advance(700);
  clock.paint();
  await Promise.resolve();
  assert.equal(ready, false);
  clock.paint();
  await readiness;
  assert.equal(ready, true);
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("a background tab becomes ready when animation frames remain suspended", async (context) => {
  const clock = browserClock(context);
  let ready = false;
  const readiness = waitForInitialAppReady({} as HTMLElement).then(() => { ready = true; });
  clock.advance(1800);
  await readiness;
  assert.equal(ready, true, "suspended frames must not leave the loader indefinitely");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("unmounting aborts readiness, even when preparation completes later", async (context) => {
  const clock = browserClock(context);
  const controller = new AbortController();
  let finishPreparation!: () => void;
  const preparation = new Promise<void>((resolve) => { finishPreparation = resolve; });
  let completions = 0;
  const readiness = waitForInitialAppReady({} as HTMLElement, controller.signal, preparation)
    .then(() => { completions += 1; });
  assert.ok(clock.frames.size + clock.timers.size > 0);
  controller.abort();
  await readiness;
  assert.equal(clock.frames.size + clock.timers.size, 0);
  finishPreparation();
  clock.advance(2000);
  await Promise.resolve();
  assert.equal(completions, 1);
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("an already-aborted mount or absent root schedules no browser work", async (context) => {
  const clock = browserClock(context);
  await waitForInitialAppReady({} as HTMLElement, AbortSignal.abort(), Promise.reject(new Error("aborted asset")));
  await waitForInitialAppReady(null, undefined, Promise.reject(new Error("unmounted asset")));
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("the opening minimum also holds with real event-loop timers", async (context) => {
  const clock = browserClock(context, false);
  const started = performance.now();
  const readiness = waitForInitialAppReady({} as HTMLElement, undefined, Promise.resolve());
  clock.paint();
  clock.paint();
  await readiness;
  assert.ok(performance.now() - started >= 690, "real timer integration must preserve the opening cadence");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});
