import type { WorkId } from "./i18n";
import { preloadPreviewImage } from "./lib/previewImages";

function sharedImport<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load().catch((error: unknown) => {
    pending = undefined;
    throw error;
  }));
}

export const loadHermesReplay = sharedImport(() => import("./HermesRemotionDemo"));
export const loadNatureLive2DReplay = sharedImport(() => import("./NatureLive2DDemo"));
export const loadGalleryReplay = sharedImport(() => import("./GalleryRemotionDemo"));
export const loadShaderReplay = sharedImport(() => import("./ShaderRemotionDemo"));

const previewImages: Partial<Record<WorkId, readonly string[]>> = {
  "hermes-yachiyo": [
    "/assets/hermes/logo.png",
    "/assets/hermes/yachiyo-default.jpg",
    "/assets/iroha/iroha.png",
    "/assets/hermes/hermes-live2d-character.png",
  ],
  "nature-live2d": ["/models/yachiyo-web/avatar.webp"],
  blog: ["/assets/screenshots/blog-irop.png"],
  gallery: [
    "/assets/gallery-new/cover-kaguya.webp",
    "/assets/gallery-new/weathering-main.webp",
    "/assets/gallery-new/cover-your-name.webp",
    "/assets/gallery-new/cover-wandering-witch.webp",
    "/assets/gallery-new/cover-bocchi.webp",
    "/assets/gallery-new/cover-girls-band-cry.webp",
    "/assets/gallery-new/cover-makeine.webp",
    "/assets/gallery-new/kaguya-visual-02.webp",
    "/assets/gallery-new/kaguya-visual-03.webp",
    "/assets/gallery-new/kaguya-story.webp",
    "/assets/gallery-new/kaguya-character.webp",
    "/assets/gallery-new/kaguya-iroha.webp",
  ],
};

const workPreloads = new Map<WorkId, Promise<void>>();
const readyPreviews = new Set<WorkId>();
const readinessListeners = new Map<WorkId, Set<() => void>>();

export function isWorkPreviewReady(id: WorkId): boolean {
  return readyPreviews.has(id);
}

export function subscribeWorkPreview(id: WorkId, listener: () => void): () => void {
  const listeners = readinessListeners.get(id) ?? new Set<() => void>();
  listeners.add(listener);
  readinessListeners.set(id, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) readinessListeners.delete(id);
  };
}

async function preloadImages(id: WorkId): Promise<void> {
  const sources = previewImages[id] ?? [];
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (next < sources.length) {
      const src = sources[next++];
      try {
        await preloadPreviewImage(src);
      } catch {
        failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, sources.length) }, worker));
  if (failed) throw new Error(`Some preview images are unavailable: ${id}`);
}

async function preloadModule(id: WorkId): Promise<void> {
  switch (id) {
    case "hermes-yachiyo":
      await loadHermesReplay();
      break;
    case "nature-live2d":
      await (await loadNatureLive2DReplay()).preloadNatureLive2D();
      break;
    case "gallery":
      await loadGalleryReplay();
      break;
    case "shader":
      await loadShaderReplay();
      break;
  }
}

// Explicit navigation/approach starts immediately, even while background slots are busy.
// Callers can mount the preview independently and keep a cover visible while it loads.
export function preloadWorkPreview(id: WorkId): Promise<void> {
  const existing = workPreloads.get(id);
  if (existing) return existing;
  const pending = Promise.allSettled([preloadModule(id), preloadImages(id)])
    .then((results) => {
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      readyPreviews.add(id);
      readinessListeners.get(id)?.forEach((listener) => listener());
    })
    .catch((error: unknown) => {
      workPreloads.delete(id);
      throw error;
    });
  workPreloads.set(id, pending);
  return pending;
}

const workOrder: WorkId[] = [
  "hermes-yachiyo", "nature-live2d", "mimo-usage-watcher", "blog", "gallery", "shader",
];
const backgroundAttempted = new Set<WorkId>();
let backgroundActive = 0;
type Scheduler = { ready: boolean; users: number; dispose: () => void };
let scheduler: Scheduler | undefined;

function limitedConnection(): boolean {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return Boolean(connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType ?? ""));
}

function startBackgroundWork(): void {
  if (!scheduler?.ready || document.hidden || limitedConnection()) return;
  while (backgroundActive < 2) {
    const id = workOrder.find((work) => !backgroundAttempted.has(work) && !workPreloads.has(work));
    if (!id) return;
    backgroundAttempted.add(id);
    backgroundActive += 1;
    void preloadWorkPreview(id).catch(() => {
      // A later explicit visit can retry; one failed preview must not stop the queue.
    }).finally(() => {
      backgroundActive -= 1;
      startBackgroundWork();
    });
  }
}

/** Start bounded warming after the first screen settles; cleanup only cancels pending work. */
export function schedulePreviewPreloads(): () => void {
  if (typeof window === "undefined" || limitedConnection()) return () => {};
  if (!scheduler) {
    const current: Scheduler = { ready: false, users: 0, dispose: () => {} };
    const timer = window.setTimeout(() => {
      current.ready = true;
      startBackgroundWork();
    }, 800);
    document.addEventListener("visibilitychange", startBackgroundWork);
    current.dispose = () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", startBackgroundWork);
    };
    scheduler = current;
  }
  const current = scheduler;
  current.users += 1;
  let cancelled = false;
  return () => {
    if (cancelled) return;
    cancelled = true;
    current.users -= 1;
    if (current.users === 0 && scheduler === current) {
      current.dispose();
      scheduler = undefined;
    }
  };
}
