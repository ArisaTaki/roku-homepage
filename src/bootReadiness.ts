const FRAME_DELAY_COUNT = 2;
const READY_TIMEOUT_MS = 1200;

// React has committed the homepage before this runs. Give it two paint frames;
// offscreen previews, images and fonts must not hold the page behind the loader.
export function waitForInitialAppReady(
  root: HTMLElement | null,
  signal?: AbortSignal,
): Promise<void> {
  if (!root || signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    let remaining = FRAME_DELAY_COUNT;
    let frame = 0;
    let timeout = 0;

    const finish = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        finish();
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    };

    signal?.addEventListener("abort", finish, { once: true });
    // Animation frames may pause in a background tab.
    timeout = window.setTimeout(finish, READY_TIMEOUT_MS);
    frame = window.requestAnimationFrame(tick);
  });
}
