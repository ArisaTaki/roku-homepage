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
  let elapsed = 0;
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
  const advance = (ms: number) => {
    elapsed += ms;
    if (mockTimers) context.mock.timers.tick(ms);
  };
  const paint = (ms = 16) => {
    advance(ms);
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(mockTimers ? elapsed : performance.now()));
  };
  return {
    frames, timers, paint, advance,
    steady(ms: number) { for (let duration = 0; duration < ms; duration += 16) paint(); },
  };
}

async function flush() { await Promise.resolve(); await Promise.resolve(); }

function observe(preparation?: Promise<unknown>, signal?: AbortSignal) {
  let completed = false;
  let status: unknown;
  const readiness = waitForInitialAppReady({} as HTMLElement, signal, preparation)
    .then((result) => { completed = true; status = result; });
  return { readiness, get completed() { return completed; }, get status() { return status; } };
}

test("fast preparation still retains a 700ms opening", async (context) => {
  const clock = browserClock(context);
  const result = observe(Promise.resolve());
  await flush();
  clock.steady(688);
  await flush();
  assert.equal(result.completed, false);
  clock.paint();
  await flush();
  assert.equal(result.status, "ready");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("resources taking longer than 1.8 seconds must actually finish before normal release", async (context) => {
  const clock = browserClock(context);
  let finishPreparation!: () => void;
  const result = observe(new Promise<void>((resolve) => { finishPreparation = resolve; }));
  clock.steady(3600);
  await flush();
  assert.equal(result.completed, false, "the old 1.8 second timer must not report readiness");
  finishPreparation();
  await flush();
  assert.equal(result.completed, false, "prepared assets must have time to appear in the DOM");
  clock.steady(192);
  await flush();
  assert.equal(result.status, "ready");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("frames painted before preparation do not count toward the stable window", async (context) => {
  const clock = browserClock(context);
  let finishPreparation!: () => void;
  const result = observe(new Promise<void>((resolve) => { finishPreparation = resolve; }));
  clock.steady(900);
  finishPreparation();
  await flush();
  clock.paint();
  clock.paint();
  await flush();
  assert.equal(result.completed, false, "two early frames alone do not prove rendering has settled");
  clock.steady(160);
  await flush();
  assert.equal(result.status, "ready");
});

test("a long frame restarts the post-preparation stability window", async (context) => {
  const clock = browserClock(context);
  const result = observe(Promise.resolve());
  await flush();
  clock.advance(700);
  clock.steady(96);
  clock.paint(100);
  clock.steady(128);
  await flush();
  assert.equal(result.completed, false, "recent initialization work must settle before revealing the page");
  clock.steady(48);
  await flush();
  assert.equal(result.status, "ready");
});

test("failed preparation releases a painted fallback and never claims resources are ready", async (context) => {
  const clock = browserClock(context);
  const result = observe(Promise.reject(new Error("image unavailable")));
  await flush();
  clock.steady(704);
  await flush();
  assert.equal(result.status, "fallback");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("a stalled resource has a 12 second escape hatch explicitly marked as timeout", async (context) => {
  const clock = browserClock(context);
  const result = observe(new Promise(() => {}));
  clock.advance(11_999);
  await flush();
  assert.equal(result.completed, false);
  clock.advance(1);
  await flush();
  assert.equal(result.status, "timeout");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("suspended animation frames also terminate through the timeout path", async (context) => {
  const clock = browserClock(context);
  const result = observe(Promise.resolve());
  await flush();
  clock.advance(12_000);
  await flush();
  assert.equal(result.status, "timeout");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("unmounting cancels timers and frames even when preparation settles later", async (context) => {
  const clock = browserClock(context);
  const controller = new AbortController();
  let finishPreparation!: () => void;
  const result = observe(new Promise<void>((resolve) => { finishPreparation = resolve; }), controller.signal);
  assert.ok(clock.timers.size > 0);
  controller.abort();
  await flush();
  assert.equal(result.status, "aborted");
  assert.equal(clock.frames.size + clock.timers.size, 0);
  finishPreparation();
  await flush();
  clock.advance(12_000);
  assert.equal(result.status, "aborted");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("an absent root or already-aborted mount schedules no work and handles rejection", async (context) => {
  const clock = browserClock(context);
  assert.equal(await waitForInitialAppReady({} as HTMLElement, AbortSignal.abort(), Promise.reject(new Error("aborted"))), "aborted");
  assert.equal(await waitForInitialAppReady(null, undefined, Promise.reject(new Error("unmounted"))), "aborted");
  assert.equal(clock.frames.size + clock.timers.size, 0);
});

test("real event-loop timers preserve the opening and release only after stable paint", async (context) => {
  const clock = browserClock(context, false);
  const started = performance.now();
  const readiness = waitForInitialAppReady({} as HTMLElement, undefined, Promise.resolve());
  const painting = setInterval(() => clock.paint(), 16);
  context.after(() => clearInterval(painting));
  const status = await readiness;
  clearInterval(painting);
  assert.equal(status, "ready");
  assert.ok(performance.now() - started >= 690);
  assert.equal(clock.frames.size + clock.timers.size, 0);
});
