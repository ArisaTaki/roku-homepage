import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const MIN_LOADING_MS = 1400;
const LOADING_TIMEOUT_MS = 8500;
const BOOT_MARK = "HacchiRoku";
const BOOT_COLORS = ["mark-coral", "mark-yellow", "mark-cyan", "mark-lavender"];

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing root element");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function loadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existingScript) {
      if ((window as Window & { Live2DCubismCore?: unknown }).Live2DCubismCore) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

async function fetchWarm(url: string): Promise<void> {
  try {
    const response = await fetch(url, { cache: "force-cache" });
    await response.arrayBuffer();
  } catch {
    // Resource warm-up should never block the app forever.
  }
}

async function preloadAppResources(): Promise<void> {
  const fontReady = "fonts" in document ? document.fonts.ready : Promise.resolve();
  const resourceWarmups = [
    fontReady,
    import("./HermesRemotionDemo"),
    import("./NatureLive2DDemo"),
    import("./ShaderRemotionDemo"),
    loadScript("/assets/vendor/live2dcubismcore.min.js"),
    fetchWarm("/models/yachiyo-web/yachiyo.model3.json"),
    fetchWarm("/models/yachiyo-web/yachiyo.moc3"),
    loadImage("/models/yachiyo-web/avatar.png"),
    loadImage("/models/yachiyo-web/textures/texture_00.png"),
    loadImage("/models/yachiyo-web/textures/texture_01.png"),
    loadImage("/assets/pet/iroha/spritesheet.webp"),
  ];

  await Promise.race([
    Promise.allSettled(resourceWarmups),
    delay(LOADING_TIMEOUT_MS),
  ]);
}

function BootLoader() {
  return (
    <div className="boot-loader" role="status" aria-label="Loading irop.one">
      <div className="boot-mark" aria-hidden="true">
        {Array.from(BOOT_MARK).map((letter, index) => (
          <span
            className={`mark-letter ${BOOT_COLORS[index % BOOT_COLORS.length]}`}
            style={{ animationDelay: `${index * 82}ms` }}
            key={`${letter}-${index}`}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}

const reactRoot = createRoot(root);

reactRoot.render(<BootLoader />);

void Promise.all([
  preloadAppResources(),
  delay(MIN_LOADING_MS),
]).finally(() => {
  reactRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
