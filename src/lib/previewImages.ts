const imagePreloads = new Map<string, Promise<void>>();
const preparedImages = new Map<string, string>();

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
