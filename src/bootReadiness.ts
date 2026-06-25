const BOOT_TIMEOUT_MS = 30_000;
const FRAME_DELAY_COUNT = 2;

const BOOT_IMAGE_URLS = [
  "/assets/pet/iroha/spritesheet.webp",
  "/assets/hermes/logo.png",
  "/assets/hermes/yachiyo-default.jpg",
  "/assets/hermes/hermes-live2d-character.png",
  "/assets/hermes/hermes-live2d-model-preview.png",
  "/assets/iroha/iroha.png",
  "/assets/screenshots/blog-irop.png",
  "/assets/screenshots/gallery-000001.webp",
  "/assets/screenshots/gallery-000004.webp",
  "/assets/screenshots/gallery-000010.webp",
  "/models/yachiyo-web/avatar.png",
  "/models/yachiyo-web/textures/texture_00.png",
  "/models/yachiyo-web/textures/texture_01.png",
] as const;

const LIVE2D_FETCH_URLS = [
  "/assets/vendor/live2dcubismcore.min.js",
  "/models/yachiyo-web/yachiyo.model3.json",
  "/models/yachiyo-web/yachiyo.moc3",
  "/models/yachiyo-web/yachiyo.physics3.json",
  "/models/yachiyo-web/yachiyo.cdi3.json",
] as const;

let bootAssetPromise: Promise<void> | null = null;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForFrames(count = FRAME_DELAY_COUNT): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }

      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  });
}

function timeoutAfter(ms: number, label: string): Promise<never> {
  return wait(ms).then(() => {
    throw new Error(`${label} timed out after ${ms}ms`);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([promise, timeoutAfter(ms, label)]);
}

function loadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const decode = image.decode?.();
      if (decode) {
        void decode.then(resolve).catch(resolve);
        return;
      }

      resolve();
    };
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

function waitForImageElement(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    const decode = image.decode?.();
    return decode ? decode.catch(() => undefined) : Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      const decode = image.decode?.();
      if (decode) {
        void decode.then(resolve).catch(resolve);
        return;
      }

      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Unable to load DOM image: ${image.currentSrc || image.src}`));
    };

    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
  });
}

async function fetchWarm(url: string): Promise<void> {
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Unable to warm ${url}: ${response.status}`);
  }

  await response.arrayBuffer();
}

async function preloadBootAssets(): Promise<void> {
  if (bootAssetPromise) return bootAssetPromise;

  bootAssetPromise = Promise.all([
    "fonts" in document ? document.fonts.ready.then(() => undefined) : Promise.resolve(),
    Promise.all(BOOT_IMAGE_URLS.map((src) => loadImage(src))).then(() => undefined),
    Promise.all(LIVE2D_FETCH_URLS.map((url) => fetchWarm(url))).then(() => undefined),
    import("./HermesRemotionDemo").then(() => undefined),
    import("./ShaderRemotionDemo").then(() => undefined),
    import("./NatureLive2DDemo").then((module) => module.preloadNatureLive2DAssets()),
  ]).then(() => undefined);

  return bootAssetPromise;
}

function queryRequired<T extends Element>(root: ParentNode, selector: string): T | null {
  return root.querySelector<T>(selector);
}

function waitForSelector<T extends Element>(
  root: ParentNode,
  selector: string,
  predicate: (element: T) => boolean = () => true,
): Promise<T> {
  const existing = queryRequired<T>(root, selector);
  if (existing && predicate(existing)) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const element = queryRequired<T>(root, selector);
      if (!element || !predicate(element)) return;
      observer.disconnect();
      resolve(element);
    });

    observer.observe(root, { attributes: true, childList: true, subtree: true });
  });
}

function waitForNoSelector(root: ParentNode, selector: string): Promise<void> {
  if (!queryRequired(root, selector)) return Promise.resolve();

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (queryRequired(root, selector)) return;
      observer.disconnect();
      resolve();
    });

    observer.observe(root, { childList: true, subtree: true });
  });
}

function hasRenderableBox(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

async function waitForDomImages(root: ParentNode): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(images.map((image) => waitForImageElement(image)));
}

async function waitForRenderedApp(root: HTMLElement): Promise<void> {
  await waitForSelector<HTMLElement>(root, ".pet-assistant .pixel-pet", hasRenderableBox);
  await waitForSelector<HTMLElement>(root, ".nature-live2d-remotion-shell", hasRenderableBox);
  await withTimeout(waitForNoSelector(root, ".work-preview-loading"), BOOT_TIMEOUT_MS, "preview mounts");
  await withTimeout(waitForSelector<HTMLElement>(root, ".nl2d-runtime-badge.is-ready"), BOOT_TIMEOUT_MS, "Live2D runtime");
  await waitForDomImages(root);
  await waitForFrames();
}

export async function waitForInitialAppReady(root: HTMLElement | null): Promise<void> {
  if (!root) return;

  await withTimeout(preloadBootAssets(), BOOT_TIMEOUT_MS, "boot assets");
  await waitForRenderedApp(root);
}
