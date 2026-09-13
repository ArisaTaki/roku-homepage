const imagePreloads = new Map<string, Promise<void>>();
const preparedImages = new Map<string, string>();
const imageListeners = new Map<string, Set<() => void>>();

/** A URL is ready only after its image has downloaded and decoded. */
export function getPreparedPreviewImage(src: string): string | undefined {
  return preparedImages.get(src);
}

export function subscribePreviewImage(src: string, listener: () => void): () => void {
  let listeners = imageListeners.get(src);
  if (!listeners) {
    listeners = new Set();
    imageListeners.set(src, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && imageListeners.get(src) === listeners) imageListeners.delete(src);
  };
}

// These are a fixed, small set of preview images. Keep their decoded Blob URLs for
// this document's lifetime so mounting a replay never depends on HTTP caching.
export function previewImageUrl(src: string): string {
  return preparedImages.get(src) ?? src;
}

export function preloadPreviewImage(src: string, priority: RequestPriority = "low"): Promise<void> {
  const existing = imagePreloads.get(src);
  if (existing) return existing;
  const controller = new AbortController();
  let objectUrl: string | undefined;
  let image: HTMLImageElement | undefined;
  let timer: number;
  const pending = new Promise<void>((resolve, reject) => {
    timer = window.setTimeout(() => {
      controller.abort();
      reject(new Error(`Preview image timed out: ${src}`));
    }, 10_000);
    void (async () => {
      const response = await fetch(src, { signal: controller.signal, priority });
      if (!response.ok) throw new Error(`Preview image unavailable: ${src}`);
      const blob = await response.blob();
      if (controller.signal.aborted) throw new Error(`Preview image cancelled: ${src}`);
      objectUrl = URL.createObjectURL(blob);
      image = new Image();
      image.decoding = "async";
      image.src = objectUrl;
      await image.decode();
      if (controller.signal.aborted) throw new Error(`Preview image cancelled: ${src}`);
      preparedImages.set(src, objectUrl);
      imageListeners.get(src)?.forEach((listener) => listener());
    })().then(resolve, reject);
  }).catch((error: unknown) => {
    controller.abort();
    if (image) image.src = "";
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    imagePreloads.delete(src);
    throw error;
  }).finally(() => window.clearTimeout(timer));
  imagePreloads.set(src, pending);
  return pending;
}
