// Run with: npx tsx --test tools/check-boot-readiness.ts
import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { waitForInitialAppReady } from "../src/bootReadiness";

function browserClock(context: TestContext) {
  context.mock.timers.enable({ apis: ["setTimeout"] });
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

test("a committed page becomes ready when browser paint frames run", async (context) => {
  const clock = browserClock(context);
  let ready = false;
  const readiness = waitForInitialAppReady({} as HTMLElement).then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false, "readiness must give the committed DOM time to paint");
  for (let count = 0; count < 10 && !ready; count += 1) {
    clock.paint();
    await Promise.resolve();
  }
  assert.equal(ready, true, "rendering should not wait on an asset or network timer");
  await readiness;
  assert.equal(clock.frames.size + clock.timers.size, 0, "completion releases scheduled work");
});

test("a background tab becomes ready even when animation frames are suspended", async (context) => {
  const clock = browserClock(context);
  let ready = false;
  const readiness = waitForInitialAppReady({} as HTMLElement).then(() => { ready = true; });
  clock.advance(1500);
  await Promise.resolve();
  assert.equal(ready, true, "a suspended animation frame must not leave the loader indefinitely");
  await readiness;
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("unmounting aborts pending readiness and cancels browser work", async (context) => {
  const clock = browserClock(context);
  const controller = new AbortController();
  const readiness = waitForInitialAppReady({} as HTMLElement, controller.signal);
  assert.ok(clock.frames.size + clock.timers.size > 0);
  controller.abort();
  await readiness;
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("an already-aborted mount or absent root schedules no browser work", async (context) => {
  const clock = browserClock(context);
  await waitForInitialAppReady({} as HTMLElement, AbortSignal.abort());
  await waitForInitialAppReady(null);
  assert.equal(clock.frames.size + clock.timers.size, 0);
});
