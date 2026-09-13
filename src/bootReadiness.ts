const FRAME_DELAY_COUNT = 2;
const MIN_OPENING_MS = 700;
const READY_TIMEOUT_MS = 1800;

// Let the opening breathe while the first screen warms. Slow or failed resources
// must still release the page within a bounded interval, including hidden tabs.
export function waitForInitialAppReady(
  root: HTMLElement | null,
  signal?: AbortSignal,
  preparation?: Promise<unknown>,
): Promise<void> {
  if (!root || signal?.aborted) {
    void preparation?.catch(() => {});
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let remaining = FRAME_DELAY_COUNT;
    let frame = 0;
    let timeout = 0;
    let minimumTimer = 0;
    let minimumElapsed = false;
    let prepared = !preparation;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.clearTimeout(minimumTimer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const checkReady = () => {
      if (minimumElapsed && prepared && remaining <= 0) finish();
    };
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        checkReady();
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    };
    const preparationSettled = () => {
      prepared = true;
      checkReady();
    };

    signal?.addEventListener("abort", finish, { once: true });
    minimumTimer = window.setTimeout(() => {
      minimumElapsed = true;
      checkReady();
    }, MIN_OPENING_MS);
    // Animation frames may pause in a background tab.
    timeout = window.setTimeout(finish, READY_TIMEOUT_MS);
    frame = window.requestAnimationFrame(tick);
    // A resource failure keeps the opening cadence, then reveals its fallback.
    void preparation?.then(preparationSettled, preparationSettled);
  });
}
