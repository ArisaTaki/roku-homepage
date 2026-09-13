const MIN_OPENING_MS = 700;
const READY_TIMEOUT_MS = 12_000;
const STABLE_PAINT_MS = 160;
const MAX_FRAME_GAP_MS = 50;

export type InitialAppReadiness = "ready" | "fallback" | "timeout" | "aborted";

// Resource completion starts the paint check: frames from before image decoding
// or module evaluation cannot establish that the prepared page is ready to show.
export function waitForInitialAppReady(
  root: HTMLElement | null,
  signal?: AbortSignal,
  preparation?: Promise<unknown>,
): Promise<InitialAppReadiness> {
  if (!root || signal?.aborted) {
    void preparation?.catch(() => {});
    return Promise.resolve("aborted");
  }

  return new Promise((resolve) => {
    let frame = 0;
    let timeout = 0;
    let minimumTimer = 0;
    let minimumElapsed = false;
    let finished = false;
    let preparedStatus: "ready" | "fallback" = "ready";
    let stableSince: number | undefined;
    let lastFrame: number | undefined;
    let stableFrames = 0;

    const finish = (status: InitialAppReadiness) => {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.clearTimeout(minimumTimer);
      signal?.removeEventListener("abort", abort);
      resolve(status);
    };
    const abort = () => finish("aborted");
    const tick = (time: number) => {
      if (finished) return;
      if (lastFrame === undefined || time - lastFrame > MAX_FRAME_GAP_MS) {
        stableSince = time;
        stableFrames = 1;
      } else {
        stableFrames += 1;
      }
      lastFrame = time;
      if (minimumElapsed && stableFrames >= 2 && time - stableSince! >= STABLE_PAINT_MS) {
        finish(preparedStatus);
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    };
    const beginPaintCheck = (status: "ready" | "fallback") => {
      if (finished) return;
      preparedStatus = status;
      frame = window.requestAnimationFrame(tick);
    };

    signal?.addEventListener("abort", abort, { once: true });
    minimumTimer = window.setTimeout(() => { minimumElapsed = true; }, MIN_OPENING_MS);
    // This is an exceptional escape hatch, including suspended background tabs;
    // callers must not confuse timing out with successful resource preparation.
    timeout = window.setTimeout(() => finish("timeout"), READY_TIMEOUT_MS);
    if (preparation) {
      void preparation.then(() => beginPaintCheck("ready"), () => beginPaintCheck("fallback"));
    } else {
      beginPaintCheck("ready");
    }
  });
}
