import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import {
  isLocale,
  localeLabels,
  localeNames,
  locales,
  uiCopy,
  workCopies,
  type Locale,
  type UiCopy,
  type WorkCopy,
  type WorkId,
} from "./i18n";
import { preloadDeferredAppAssets, waitForInitialAppReady } from "./bootReadiness";
import { askIrohaStream, type AssistantAnswerWithRuntime } from "./lib/iropAssistantClient";

const TRAVEL_DISTANCE = 7200;
const LOCALE_STORAGE_KEY = "irop-locale";
const IROHA_SESSION_STORAGE_PREFIX = "irop-iroha-session";
const MOBILE_QUERY = "(max-width: 760px)";
const FISH_BACKGROUND_MAX_PIXELS = 1_600_000;
const FISH_BACKGROUND_PROGRESS_EVENT = "irop:fish-progress";

const loadHermesReplay = () => import("./HermesRemotionDemo");
const loadNatureLive2DReplay = () => import("./NatureLive2DDemo");
const loadShaderReplay = () => import("./ShaderRemotionDemo");
const interactivePreviewLoaders: Array<() => Promise<unknown>> = [
  loadHermesReplay,
  loadNatureLive2DReplay,
  loadShaderReplay,
];

const HermesReplay = lazy(() => loadHermesReplay().then((module) => ({ default: module.HermesReplay })));
const NatureLive2DReplay = lazy(() => (
  loadNatureLive2DReplay().then((module) => ({ default: module.NatureLive2DReplay }))
));
const ShaderReplay = lazy(() => loadShaderReplay().then((module) => ({ default: module.ShaderReplay })));

type WorkBase = {
  id: WorkId;
  href: string;
  visual?: string;
  image?: string;
  width: number;
  left: number;
  square?: boolean;
  short?: boolean;
};

type Work = WorkBase & WorkCopy;

type AppProps = {
  isBooting?: boolean;
  onReady?: () => void;
};

type PetMessage = Partial<AssistantAnswerWithRuntime> & {
  role: "assistant" | "user";
  text: string;
  pending?: boolean;
};

type PetMood = NonNullable<AssistantAnswerWithRuntime["mood"]>;

type PetSession = {
  messages: PetMessage[];
  runtimeLabel: string;
  petMood: PetMood;
};

type LightFish = {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  hue: number;
  alpha: number;
  depth: number;
  seed: number;
};

const workShells: WorkBase[] = [
  {
    id: "hermes-yachiyo",
    href: "https://github.com/kuguya-AI-app-develop/Hermes-Yachiyo",
    visual: "visual-hermes",
    width: 620,
    left: 1500,
  },
  {
    id: "nature-live2d",
    href: "https://github.com/kuguya-AI-app-develop/nature-live2d",
    visual: "visual-live2d",
    width: 620,
    left: 2440,
  },
  {
    id: "mimo-usage-watcher",
    href: "https://github.com/kuguya-AI-app-develop/mimo-usage-watcher",
    visual: "visual-mimo",
    width: 540,
    left: 3290,
  },
  {
    id: "blog",
    href: "https://blog.irop.one/",
    image: "/assets/screenshots/blog-irop.png",
    width: 640,
    left: 4150,
  },
  {
    id: "gallery",
    href: "https://images.irop.one/",
    image: "/assets/screenshots/gallery-000001.webp",
    width: 540,
    left: 5110,
  },
  {
    id: "shader",
    href: "https://shader.irop.one/",
    visual: "visual-shader",
    width: 580,
    left: 6030,
  },
  {
    id: "portal",
    href: "mailto:me@irop.one",
    visual: "visual-portal",
    width: 520,
    left: 6880,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function browserLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(saved)) return saved;
  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("zh")) return "zh";
  if (browserLanguage.startsWith("ja")) return "ja";
  return "en";
}

function htmlLang(locale: Locale): string {
  if (locale === "zh") return "zh-CN";
  if (locale === "ja") return "ja";
  return "en";
}

function useLocale(): [Locale, (locale: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>(browserLocale);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  };

  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
  }, [locale]);

  return [locale, setLocale];
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  ));

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function preloadInteractiveWorkVisuals() {
  void Promise.allSettled([
    preloadDeferredAppAssets(),
    ...interactivePreviewLoaders.map((loadPreview) => loadPreview()),
  ]);
}

function useHasEnteredViewport<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (hasEntered) return undefined;

    const node = ref.current;
    if (!node) return undefined;

    if (!("IntersectionObserver" in window)) {
      setHasEntered(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setHasEntered(true);
      observer.disconnect();
    }, { rootMargin: "900px 600px", threshold: 0.01 });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasEntered]);

  return [ref, hasEntered];
}

function localizeRuntimeLabel(runtimeLabel: string | undefined, copy: UiCopy["pet"]): string {
  const label = runtimeLabel?.toUpperCase() || "";
  if (label.includes("QUERY")) return copy.queryingRuntime;
  if (label.includes("FALLBACK")) return copy.fallbackRuntime;
  if (label.includes("REMOTE")) return copy.remoteRuntime;
  if (label.includes("LOCAL") || label.includes("SERVER KB")) return copy.idleRuntime;
  return runtimeLabel || copy.idleRuntime;
}

function useSceneProgress(sceneRef: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = scene.getBoundingClientRect();
      const range = Math.max(1, scene.offsetHeight - window.innerHeight);
      setProgress(clamp(-rect.top / range, 0, 1));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sceneRef]);

  return progress;
}

function LightFishBackground({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
    window.dispatchEvent(new Event(FISH_BACKGROUND_PROGRESS_EVENT));
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fish: LightFish[] = [];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let lastTime = performance.now();
    let frame = 0;
    let previousProgress = progressRef.current;
    let pendingScrollSync = false;

    const palette = [184, 198, 214, 292, 324, 44, 162];
    const random = (min: number, max: number) => min + Math.random() * (max - min);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelBudgetRatio = Math.sqrt(FISH_BACKGROUND_MAX_PIXELS / Math.max(1, width * height));
      pixelRatio = Math.max(0.5, Math.min(window.devicePixelRatio || 1, 1, pixelBudgetRatio));
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const areaCount = Math.floor((width * height) / 5600);
      const targetCount = reduceMotion.matches
        ? 48
        : width < 760
          ? Math.min(170, Math.max(96, areaCount))
          : Math.min(320, Math.max(160, areaCount));
      if (fish.length > targetCount) {
        fish.splice(targetCount);
      }

      while (fish.length < targetCount) {
        const depth = random(0.45, 1);
        fish.push({
          x: random(-width * 0.12, width * 1.12),
          y: random(-height * 0.12, height * 1.12),
          size: random(4, 15) * depth,
          speed: random(28, 78) * depth,
          angle: random(-0.26, 0.26),
          hue: palette[Math.floor(random(0, palette.length))],
          alpha: random(0.34, 0.82) * depth,
          depth,
          seed: random(0, 1000),
        });
      }
    };

    const wrapFish = (item: LightFish) => {
      const margin = 130;
      if (item.x > width + margin) item.x = -margin;
      if (item.x < -margin) item.x = width + margin;
      if (item.y > height + margin) item.y = -margin;
      if (item.y < -margin) item.y = height + margin;
    };

    const drawFish = (item: LightFish, progressPhase: number, scrollDrift: number) => {
      const shimmer = 0.74 + Math.sin(progressPhase * 18 + item.seed) * 0.26;
      const angle = item.angle + Math.sin(progressPhase * 9 + item.seed) * 0.2 + scrollDrift * 0.05;
      const length = item.size * (2.2 + item.depth * 0.65);
      const body = item.size * 0.42;
      const tail = item.size * 0.7;

      context.save();
      context.translate(item.x, item.y);
      context.rotate(angle);
      context.globalAlpha = item.alpha * shimmer;
      context.fillStyle = `hsla(${item.hue}, 94%, ${70 + item.depth * 10}%, 0.78)`;
      context.beginPath();
      context.moveTo(length * 0.56, 0);
      context.quadraticCurveTo(length * 0.02, -body, -length * 0.34, -body * 0.4);
      context.quadraticCurveTo(-length * 0.18, 0, -length * 0.34, body * 0.4);
      context.quadraticCurveTo(length * 0.02, body, length * 0.56, 0);
      context.fill();

      context.globalAlpha = item.alpha * 0.58 * shimmer;
      context.beginPath();
      context.moveTo(-length * 0.34, 0);
      context.lineTo(-length * 0.62, -tail * 0.46);
      context.lineTo(-length * 0.52, 0);
      context.lineTo(-length * 0.62, tail * 0.46);
      context.closePath();
      context.fill();

      context.globalAlpha = item.alpha * 0.3;
      context.strokeStyle = `hsla(${item.hue}, 94%, 76%, 0.42)`;
      context.lineWidth = Math.max(1, item.size * 0.08);
      context.beginPath();
      context.moveTo(-length * 0.3, 0);
      context.lineTo(-length * (1.3 + item.depth * 0.4), Math.sin(progressPhase * 13 + item.seed) * item.size * 0.42);
      context.stroke();
      context.restore();
    };

    const drawCurrent = (scrollDrift: number) => {
      context.save();
      context.lineWidth = 1;

      for (let index = 0; index < 4; index += 1) {
        const hue = palette[index % palette.length];
        const y = height * (0.16 + index * 0.2);
        const alpha = 0.045 + Math.abs(scrollDrift) * 0.018;
        const gradient = context.createLinearGradient(0, y, width, y + 80);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0)`);
        gradient.addColorStop(0.48, `hsla(${hue}, 100%, 70%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
        context.strokeStyle = gradient;
        context.beginPath();

        for (let x = -60; x <= width + 60; x += 80) {
          const wave = Math.sin(x * 0.007 + index) * (24 + index * 1.4);
          if (x === -60) {
            context.moveTo(x, y + wave);
          } else {
            context.lineTo(x, y + wave);
          }
        }

        context.stroke();
      }

      context.restore();
    };

    const drawSurfaceLight = (progressPhase: number, scrollDrift: number) => {
      context.save();
      context.globalCompositeOperation = "screen";

      const topWash = context.createLinearGradient(0, 0, 0, height);
      topWash.addColorStop(0, "rgba(184, 248, 255, 0.18)");
      topWash.addColorStop(0.12, "rgba(255, 244, 184, 0.08)");
      topWash.addColorStop(0.34, "rgba(104, 204, 220, 0.035)");
      topWash.addColorStop(0.72, "rgba(104, 204, 220, 0)");
      context.fillStyle = topWash;
      context.fillRect(0, 0, width, height);

      const bloom = context.createRadialGradient(
        width * 0.48,
        -height * 0.06,
        Math.min(width, height) * 0.02,
        width * 0.5,
        height * 0.03,
        Math.max(width, height) * 0.52
      );
      bloom.addColorStop(0, "rgba(255, 246, 202, 0.16)");
      bloom.addColorStop(0.42, "rgba(116, 225, 238, 0.08)");
      bloom.addColorStop(1, "rgba(116, 225, 238, 0)");
      context.fillStyle = bloom;
      context.fillRect(0, 0, width, height);

      context.lineCap = "round";
      for (let index = 0; index < 6; index += 1) {
        const y = height * (0.035 + index * 0.045);
        const alpha = 0.055 - index * 0.006 + Math.abs(scrollDrift) * 0.01;
        const gradient = context.createLinearGradient(width * 0.12, y, width * 0.88, y + 46);
        gradient.addColorStop(0, "rgba(184, 248, 255, 0)");
        gradient.addColorStop(0.48, `rgba(255, 246, 202, ${alpha})`);
        gradient.addColorStop(0.72, `rgba(184, 248, 255, ${alpha * 0.72})`);
        gradient.addColorStop(1, "rgba(184, 248, 255, 0)");
        context.strokeStyle = gradient;
        context.lineWidth = 1.1 + index * 0.28;
        context.beginPath();

        for (let x = -80; x <= width + 80; x += 72) {
          const wave = Math.sin(x * 0.012 + progressPhase * 10 + index * 1.6) * (9 + index * 1.8);
          const drift = Math.sin(progressPhase * 6 + index) * 10;
          if (x === -80) {
            context.moveTo(x, y + wave + drift);
          } else {
            context.lineTo(x, y + wave + drift);
          }
        }

        context.stroke();
      }

      context.restore();
    };

    const render = (now: number, syncToScroll: boolean) => {
      if (document.hidden) {
        lastTime = now;
        return;
      }

      lastTime = now;

      const currentProgress = progressRef.current;
      const progressDelta = syncToScroll ? currentProgress - previousProgress : 0;
      previousProgress = currentProgress;
      const scrollDirection = Math.sign(progressDelta) || 1;
      const scrollCurrent = reduceMotion.matches
        ? 0
        : clamp(Math.abs(progressDelta) * 220, 0, 1.4) * scrollDirection;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";

      const vignette = context.createRadialGradient(
        width * 0.48,
        height * 0.42,
        Math.min(width, height) * 0.08,
        width * 0.5,
        height * 0.48,
        Math.max(width, height) * 0.76
      );
      vignette.addColorStop(0, "rgba(104, 204, 220, 0.09)");
      vignette.addColorStop(0.48, "rgba(12, 20, 34, 0.02)");
      vignette.addColorStop(1, "rgba(3, 7, 14, 0.58)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      drawSurfaceLight(currentProgress, scrollCurrent);
      drawCurrent(scrollCurrent * 0.28);
      context.globalCompositeOperation = "source-over";

      for (const item of fish) {
        if (syncToScroll && !reduceMotion.matches && scrollCurrent !== 0) {
          const scrollForce = Math.abs(scrollCurrent);
          const phase = currentProgress * (24 + item.depth * 18) + item.seed;
          const wiggle = Math.sin(phase) * 0.62;
          const dart = Math.sin(phase * 0.47 + item.seed) * 0.38;
          const swimAngle = item.angle + wiggle * 0.34 + scrollDirection * 0.08 + dart * 0.16;
          const swim = scrollForce * (10 + item.speed * 0.22) * item.depth;
          item.x += Math.cos(swimAngle) * swim;
          item.y += Math.sin(swimAngle) * swim * 0.72 + wiggle * scrollForce * 3.8;
          wrapFish(item);
        }

        drawFish(item, currentProgress, scrollCurrent);
      }
    };

    const scheduleRender = (syncToScroll = false) => {
      pendingScrollSync = pendingScrollSync || syncToScroll;
      if (frame) return;
      frame = window.requestAnimationFrame((now) => {
        frame = 0;
        const shouldSync = pendingScrollSync;
        pendingScrollSync = false;
        render(now, shouldSync);
      });
    };

    const handleResize = () => {
      resize();
      scheduleRender();
    };

    const handleProgress = () => {
      const nextProgress = progressRef.current;
      const moved = Math.abs(nextProgress - previousProgress) > 0.0004;
      if (moved) {
        scheduleRender(true);
      } else {
        scheduleRender();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) return;
      lastTime = performance.now();
      scheduleRender();
    };

    resize();
    render(lastTime, false);
    window.addEventListener("resize", handleResize);
    window.addEventListener(FISH_BACKGROUND_PROGRESS_EVENT, handleProgress);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(FISH_BACKGROUND_PROGRESS_EVENT, handleProgress);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <canvas className="light-fish-canvas" ref={canvasRef} aria-hidden="true" />;
}

function HeroMark({ className = "", text = "irop" }: { className?: string; text?: string }) {
  const tones = ["coral", "yellow", "cyan", "lavender"];

  return (
    <div className={`hero-mark ${className}`} aria-hidden="true">
      {[...text].map((letter, index) => (
        <span className={`mark-letter mark-${tones[index % tones.length]}`} key={`${letter}-${index}`}>
          {letter}
        </span>
      ))}
    </div>
  );
}

function PixelPet({ className = "", mood = "idle" }: { className?: string; mood?: PetMood }) {
  return <span className={`pixel-pet ${className}`} data-mood={mood} aria-hidden="true" />;
}

function initialPetMessages(copy: UiCopy["pet"]): PetMessage[] {
  return [
    {
      role: "assistant",
      text: copy.initialText,
      source: copy.initialSource,
    },
  ];
}

function isPetMood(value: unknown): value is PetMood {
  return value === "idle"
    || value === "thinking"
    || value === "happy"
    || value === "confused"
    || value === "shy"
    || value === "error";
}

function unwrapStoredPetText(value: string, depth = 0): string {
  if (depth > 2) return value;

  const normalized = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!normalized) return value;

  try {
    const parsed = JSON.parse(normalized);
    if (typeof parsed === "string") return unwrapStoredPetText(parsed, depth + 1);
    if (parsed && typeof parsed === "object" && typeof (parsed as { text?: unknown }).text === "string") {
      return String((parsed as { text: string }).text).trim() || value;
    }
  } catch {
    const objectStart = normalized.indexOf("{");
    const objectEnd = normalized.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        const parsed = JSON.parse(normalized.slice(objectStart, objectEnd + 1));
        if (parsed && typeof parsed === "object" && typeof (parsed as { text?: unknown }).text === "string") {
          return String((parsed as { text: string }).text).trim() || value;
        }
      } catch {
        return value;
      }
    }
  }

  return value;
}

function readPetSession(sessionKey: string): PetSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(sessionKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PetSession>;
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.filter((message): message is PetMessage => (
        Boolean(message)
          && (message.role === "assistant" || message.role === "user")
          && typeof message.text === "string"
          && !message.pending
      )).map((message) => ({
        ...message,
        text: message.role === "assistant" ? unwrapStoredPetText(message.text) : message.text,
      }))
      : [];

    if (!messages.length) return null;

    return {
      messages,
      runtimeLabel: typeof parsed.runtimeLabel === "string" ? parsed.runtimeLabel : "",
      petMood: isPetMood(parsed.petMood) ? parsed.petMood : "idle",
    };
  } catch {
    return null;
  }
}

function writePetSession(sessionKey: string, session: PetSession): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
  } catch {
    // Losing this cache should never break the assistant itself.
  }
}

function PetAssistant({
  className = "",
  compact = false,
  copy,
  sessionKey,
}: {
  className?: string;
  compact?: boolean;
  copy: UiCopy["pet"];
  sessionKey: string;
}) {
  const [messages, setMessages] = useState<PetMessage[]>(
    () => readPetSession(sessionKey)?.messages || initialPetMessages(copy)
  );
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [runtimeLabel, setRuntimeLabel] = useState<string>(
    () => readPetSession(sessionKey)?.runtimeLabel || copy.idleRuntime
  );
  const [petMood, setPetMood] = useState<PetMood>(
    () => readPetSession(sessionKey)?.petMood || "idle"
  );
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const askRunRef = useRef(0);

  useEffect(() => {
    const storedSession = readPetSession(sessionKey);
    setInput("");
    setIsThinking(false);

    if (storedSession) {
      setRuntimeLabel(storedSession.runtimeLabel || copy.idleRuntime);
      setPetMood(storedSession.petMood);
      setMessages(storedSession.messages);
      return;
    }

    setRuntimeLabel(copy.idleRuntime);
    setPetMood("idle");
    setMessages(initialPetMessages(copy));
  }, [copy, sessionKey]);

  useEffect(() => {
    const messagePanel = messagesRef.current;
    if (!messagePanel) return;
    messagePanel.scrollTop = 0;
  }, [messages]);

  const ask = async (question: string, displayQuestion = question) => {
    const normalized = question.trim();
    if (!normalized || isThinking) return;
    const askRun = askRunRef.current + 1;
    askRunRef.current = askRun;
    setInput("");
    setIsThinking(true);
    setRuntimeLabel(copy.queryingRuntime);
    setPetMood("thinking");
    setMessages(
      compact
        ? [{ role: "assistant", text: copy.pendingText, source: copy.pendingSource, pending: true }]
        : [
            { role: "user", text: displayQuestion },
            { role: "assistant", text: copy.pendingText, source: copy.pendingSource, pending: true },
          ]
    );

    try {
      const streamPendingAnswer = (text: string) => {
        if (askRunRef.current !== askRun) return;

        setMessages(
          compact
            ? [{ role: "assistant", text, source: copy.pendingSource, pending: true }]
            : [
                { role: "user", text: displayQuestion },
                { role: "assistant", text, source: copy.pendingSource, pending: true },
              ]
        );
      };
      const answer = await askIrohaStream(normalized, {
        onToken: streamPendingAnswer,
      });
      if (askRunRef.current !== askRun) return;
      const nextRuntimeLabel = localizeRuntimeLabel(answer.runtimeLabel, copy);
      const nextPetMood = answer.mood || "happy";
      const nextMessages: PetMessage[] = compact
        ? [{ role: "assistant", ...answer }]
        : [
            { role: "user", text: displayQuestion },
            { role: "assistant", ...answer },
          ];

      setRuntimeLabel(nextRuntimeLabel);
      setPetMood(nextPetMood);
      setMessages(nextMessages);
      writePetSession(sessionKey, {
        messages: nextMessages,
        runtimeLabel: nextRuntimeLabel,
        petMood: nextPetMood,
      });
    } catch (error) {
      const nextRuntimeLabel = copy.fallbackRuntime;
      const nextPetMood = "error";
      const nextMessages: PetMessage[] = compact
        ? [{ role: "assistant", text: copy.pendingText, source: copy.pendingSource, mood: "error" }]
        : [
            { role: "user", text: displayQuestion },
            { role: "assistant", text: copy.pendingText, source: copy.pendingSource, mood: "error" },
          ];

      setRuntimeLabel(nextRuntimeLabel);
      setPetMood(nextPetMood);
      setMessages(nextMessages);
      writePetSession(sessionKey, {
        messages: nextMessages,
        runtimeLabel: nextRuntimeLabel,
        petMood: nextPetMood,
      });
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <section className={`pet-assistant ${compact ? "compact" : ""} ${className}`} aria-label={copy.aria}>
      <div className="pet-stage">
        <PixelPet mood={petMood} />
        <div className="pet-signal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="pet-console">
        <div className="pet-console-top">
          <span>{copy.title}</span>
          <b>{runtimeLabel}</b>
        </div>
        <div className="pet-messages" aria-live="polite" aria-busy={isThinking} ref={messagesRef}>
          {messages.map((message, index) => (
            <p
              className={`pet-message ${message.role} ${message.pending ? "pending" : ""}`}
              key={`${message.role}-${index}-${message.text}`}
            >
              <span>{message.text}</span>
              {message.role === "assistant" && message.source ? (
                <small>
                  {copy.sourcePrefix}: {message.source}
                  {message.confidence ? ` · ${message.confidence}` : ""}
                </small>
              ) : null}
              {!compact && message.role === "assistant" && message.details?.length ? (
                <span className="pet-message-detail">{message.details[0]}</span>
              ) : null}
              {message.role === "assistant" && message.links?.length ? (
                <span className="pet-message-links">
                  {message.links.slice(0, 2).map((link) => (
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                      key={link.href}
                    >
                      {link.label}
                    </a>
                  ))}
                </span>
              ) : null}
            </p>
          ))}
        </div>
        <div className="pet-chips" aria-label={copy.chipsAria}>
          {copy.questions.map((question) => (
            <button
              type="button"
              onClick={() => void ask(question.query, question.label)}
              key={question.query}
              disabled={isThinking}
            >
              {question.label}
            </button>
          ))}
        </div>
        <form
          className="pet-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void ask(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.inputAria}
            disabled={isThinking}
          />
          <button type="submit" disabled={isThinking}>{isThinking ? copy.thinkingButton : copy.askButton}</button>
        </form>
      </div>
    </section>
  );
}

function AboutColumns({ copy }: { copy: UiCopy }) {
  return (
    <div className="about-columns" aria-label={copy.aboutColumnsAria}>
      {copy.aboutColumns.map((column) => (
        <article key={column.title}>
          <h3>{column.title}</h3>
          {"body" in column ? (
            <p>{column.body}</p>
          ) : (
            <p>
              {column.beforeEmail} <a href="mailto:me@irop.one">me@irop.one</a>. {column.afterEmail}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function HermesMobilePreview({ copy }: { copy: UiCopy["hermesMobile"] }) {
  return (
    <div className="hermes-mobile-preview" aria-hidden="true">
      <div className="hm-titlebar">
        <span />
        <span />
        <span />
        <b>
          <img src="/assets/hermes/logo.png" alt="" />
          Hermes Yachiyo
        </b>
      </div>
      <div className="hm-body">
        <aside className="hm-rail">
          <img src="/assets/hermes/logo.png" alt="" />
          {copy.nav.map((item, index) => (
            <span className={index === 0 ? "is-active" : ""} key={item}>
              {item}
            </span>
          ))}
        </aside>
        <main className="hm-panel">
          <header>
            <img src="/assets/hermes/yachiyo-default.jpg" alt="" />
            <div>
              <b>月見八千代</b>
              <span>{copy.status}</span>
            </div>
          </header>
          <div className="hm-chat">
            <p>{copy.messages[0]}</p>
            <p className="is-user">{copy.messages[1]}</p>
            <p className="is-reply">{copy.messages[2]}</p>
          </div>
          <div className="hm-tools">
            {copy.tools.map((tool) => (
              <span key={tool}>{tool}</span>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function WorkVisualPlaceholder({ work }: { work: Work }) {
  return (
    <div className={`work-visual ${work.visual ?? ""}`} aria-hidden="true">
      <span className="visual-kicker">{work.meta.split(",")[0]}</span>
      <strong>{work.title}</strong>
      <em>{work.description}</em>
      <div className="visual-grid">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function WorkVisualLoading({
  work,
  previewRef,
}: {
  work: Work;
  previewRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={previewRef} className={`work-preview-loading ${work.visual ?? ""}`} aria-hidden="true">
      <span />
    </div>
  );
}

function DeferredWorkPreview({
  work,
  children,
  forceLoad = false,
}: {
  work: Work;
  children: ReactNode;
  forceLoad?: boolean;
}) {
  const [ref, hasEntered] = useHasEnteredViewport<HTMLDivElement>();
  const [hasForcedLoad, setHasForcedLoad] = useState(forceLoad);
  const fallback = <WorkVisualLoading work={work} />;

  useEffect(() => {
    if (forceLoad) setHasForcedLoad(true);
  }, [forceLoad]);

  if (!hasEntered && !hasForcedLoad) {
    return <WorkVisualLoading work={work} previewRef={ref} />;
  }

  return <Suspense fallback={fallback}>{children}</Suspense>;
}

function WorkVisual({
  work,
  copy,
  layout,
  eagerPreview = false,
}: {
  work: Work;
  copy: UiCopy;
  layout: "desktop" | "mobile";
  eagerPreview?: boolean;
}) {
  if (work.image) {
    return <img src={work.image} alt="" />;
  }

  if (work.visual === "visual-hermes") {
    if (layout === "mobile") {
      return <HermesMobilePreview copy={copy.hermesMobile} />;
    }

    return (
      <DeferredWorkPreview work={work} forceLoad={eagerPreview}>
        <HermesReplay />
        <HermesMobilePreview copy={copy.hermesMobile} />
      </DeferredWorkPreview>
    );
  }

  if (work.visual === "visual-live2d") {
    return (
      <DeferredWorkPreview work={work} forceLoad={eagerPreview}>
        <NatureLive2DReplay />
      </DeferredWorkPreview>
    );
  }

  if (work.visual === "visual-shader") {
    return (
      <DeferredWorkPreview work={work} forceLoad={eagerPreview}>
        <ShaderReplay />
      </DeferredWorkPreview>
    );
  }

  return <WorkVisualPlaceholder work={work} />;
}

function workCardClass(baseClass: string, work: Work): string {
  return `${baseClass} ${work.visual === "visual-hermes" ? "is-hermes" : ""} ${
    work.visual === "visual-live2d" ? "is-nature-live2d" : ""
  } ${
    work.visual === "visual-shader" ? "is-shader" : ""
  } ${
    work.square ? "square" : ""
  } ${work.short ? "short" : ""}`;
}

function LanguageSwitcher({
  locale,
  onLocaleChange,
  label,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  label: string;
}) {
  return (
    <div className="language-switcher" aria-label={label}>
      {locales.map((item) => (
        <button
          className={item === locale ? "is-active" : ""}
          type="button"
          onClick={() => onLocaleChange(item)}
          aria-pressed={item === locale}
          title={localeNames[item]}
          key={item}
        >
          {localeLabels[item]}
        </button>
      ))}
    </div>
  );
}

function FloatingNav({
  compact,
  showMini,
  locale,
  onLocaleChange,
  copy,
}: {
  compact: boolean;
  showMini: boolean;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  copy: UiCopy;
}) {
  return (
    <>
      <a className={`mini-logo ${showMini ? "visible" : ""}`} href="#top" aria-label={copy.nav.home}>
        <HeroMark className="mini-name-mark" text="HacchiRoku" />
      </a>
      <nav className={`nav-card ${compact ? "compact" : ""}`} aria-label={copy.nav.primary}>
        <a className="nav-row" href="#project">
          <span>{copy.nav.works}</span>
          <span className="arrow">→</span>
          <span className="icon-strip" aria-hidden="true">
            <i>AI</i>
            <i>2D</i>
            <i>GL</i>
            <i>画</i>
            <i>?</i>
          </span>
        </a>
        <div className="nav-row nav-row-menu">
          <a className="nav-row-main" href="#about">
            <span>{copy.nav.me}</span>
            <span className="arrow">→</span>
          </a>
          <span className="icon-strip social-strip">
            <a href="https://github.com/kuguya-AI-app-develop" target="_blank" rel="noreferrer">
              gh
            </a>
            <a href="https://blog.irop.one/" target="_blank" rel="noreferrer">
              blog
            </a>
          </span>
        </div>
        <a className="nav-row resume" href="mailto:me@irop.one">
          <span>{copy.nav.email}</span>
          <span className="download">→</span>
        </a>
        <LanguageSwitcher locale={locale} onLocaleChange={onLocaleChange} label={copy.nav.language} />
      </nav>
      <a className={`where-card ${compact ? "visible" : ""}`} href="#top" aria-label={copy.nav.backHome}>
        <span>{copy.nav.where}</span>
        <span>?</span>
      </a>
    </>
  );
}

function DesktopScene({
  progress,
  works,
  copy,
  petSessionKey,
  eagerPreview,
}: {
  progress: number;
  works: Work[];
  copy: UiCopy;
  petSessionKey: string;
  eagerPreview: boolean;
}) {
  const transform = useMemo(() => `translate3d(${-progress * TRAVEL_DISTANCE}px, 0, 0)`, [progress]);

  return (
    <div className="stage" aria-label={copy.hero.stageAria}>
      <div className="desktop-track" style={{ transform }}>
        <h1 className="desktop-title">irop.one</h1>
        <p className="desktop-intro">
          {copy.hero.intro[0]}
          <br />
          {copy.hero.intro[1]}
          <br />
          {copy.hero.intro[2]}
        </p>
        <HeroMark className="desktop-mark desktop-name-mark" text="HacchiRoku" />
        <PetAssistant className="hero-assistant" copy={copy.pet} sessionKey={petSessionKey} />
        <div className="this-way">
          <span>
            {copy.hero.thisWay[0]}
            <br />
            {copy.hero.thisWay[1]}
          </span>
          <b aria-hidden="true">→</b>
        </div>
        {works.map((work) => (
          <a
            className={workCardClass("work-card", work)}
            href={work.href}
            key={work.id}
            style={{ left: `${work.left}px`, width: `${work.width}px` }}
            target={work.href?.startsWith("http") ? "_blank" : undefined}
            rel={work.href?.startsWith("http") ? "noreferrer" : undefined}
          >
            <WorkVisual work={work} copy={copy} layout="desktop" eagerPreview={eagerPreview} />
            <h2>{work.title}</h2>
            <p>{work.description}</p>
            <small>{work.meta}</small>
          </a>
        ))}
      </div>
    </div>
  );
}

function MobilePage({
  works,
  copy,
  petSessionKey,
  eagerPreview,
}: {
  works: Work[];
  copy: UiCopy;
  petSessionKey: string;
  eagerPreview: boolean;
}) {
  return (
    <div className="mobile-page">
      <section className="mobile-hero" aria-labelledby="mobile-title">
        <h1 id="mobile-title">irop.one</h1>
        <p>
          {copy.hero.mobileIntro[0]}
          <br />
          {copy.hero.mobileIntro[1]}
          <br />
          {copy.hero.mobileIntro[2]}
        </p>
        <div className="mobile-logo-wrap">
          <HeroMark className="mobile-mark mobile-name-mark" text="HacchiRoku" />
        </div>
        <PetAssistant className="mobile-hero-assistant" compact copy={copy.pet} sessionKey={petSessionKey} />
        <a className="mobile-this-way" href="#mobile-works">
          <span>
            {copy.hero.thisWay[0]}
            <br />
            {copy.hero.thisWay[1]}
          </span>
          <b aria-hidden="true">↓</b>
        </a>
      </section>
      <section id="mobile-works" className="mobile-works" aria-label={copy.nav.works}>
        {works.map((work) => (
          <a
            className={workCardClass("mobile-work", work)}
            href={work.href}
            key={work.id}
            target={work.href?.startsWith("http") ? "_blank" : undefined}
            rel={work.href?.startsWith("http") ? "noreferrer" : undefined}
          >
            <WorkVisual work={work} copy={copy} layout="mobile" eagerPreview={eagerPreview} />
            <h2>{work.title}</h2>
            <p>{work.description}</p>
            <small>{work.meta}</small>
          </a>
        ))}
      </section>
      <section id="mobile-about" className="mobile-about" aria-label={copy.about.aria}>
        <div className="mobile-wave" aria-hidden="true" />
        <h2>
          {copy.about.mobileStart} <span className="blue">{copy.about.mobileBlue}</span>,
          <br />
          <span className="green">{copy.about.mobileGreen}</span>
          <br />
          {copy.about.mobileEnd}
        </h2>
        <AboutColumns copy={copy} />
        <a className="mobile-mail" href="mailto:me@irop.one">
          me@irop.one
        </a>
      </section>
    </div>
  );
}

function AboutPanel({ copy }: { copy: UiCopy }) {
  return (
    <section id="about" className="about-panel" aria-label={copy.about.aria}>
      <div className="about-shell">
        <p className="about-kicker">{copy.about.kicker}</p>
        <h2>
          {copy.about.headline[0]}
          <br />
          {copy.about.headline[1]}
          <br />
          {copy.about.headline[2]}
          <br />
          {copy.about.headline[3]}
        </h2>
        <AboutColumns copy={copy} />
      </div>
    </section>
  );
}

export default function App({ isBooting = false, onReady }: AppProps) {
  const [locale, setLocale] = useLocale();
  const [eagerPreviewCards, setEagerPreviewCards] = useState(isBooting);
  const appRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLElement | null>(null);
  const progress = useSceneProgress(sceneRef);
  const isMobileLayout = useMediaQuery(MOBILE_QUERY);
  const copy = uiCopy[locale];
  const petSessionKey = `${IROHA_SESSION_STORAGE_PREFIX}-${locale}`;
  const works = useMemo(
    () => workShells.map((work) => ({ ...work, ...workCopies[locale][work.id] })),
    [locale]
  );
  const compactNav = progress > 0.13;
  const showMiniLogo = progress > 0.13 && progress < 0.98;

  useEffect(() => {
    if (!isBooting) return undefined;

    let cancelled = false;
    setEagerPreviewCards(true);

    void waitForInitialAppReady(appRef.current)
      .catch((error) => {
        console.error("Initial app readiness check failed", error);
      })
      .finally(() => {
        if (!cancelled) onReady?.();
      });

    return () => {
      cancelled = true;
    };
  }, [isBooting, onReady]);

  useEffect(() => {
    if (isBooting) return undefined;

    const previewMountHandle = window.setTimeout(() => {
      setEagerPreviewCards(true);
    }, 300);

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let timeoutHandle = 0;
    const idleHandle = idleWindow.requestIdleCallback?.(preloadInteractiveWorkVisuals, { timeout: 1200 });

    if (!idleHandle) {
      timeoutHandle = window.setTimeout(preloadInteractiveWorkVisuals, 650);
    }

    return () => {
      window.clearTimeout(previewMountHandle);
      if (idleHandle) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
    };
  }, [isBooting]);

  return (
    <>
      <FloatingNav
        compact={compactNav}
        showMini={showMiniLogo}
        locale={locale}
        onLocaleChange={setLocale}
        copy={copy}
      />
      <div className={`app-shell ${isBooting ? "is-booting" : "is-ready"}`} ref={appRef}>
        <LightFishBackground progress={progress} />
        <a className="skip-link" href="#project">
          {copy.skip}
        </a>
        <div id="top" />
        <main>
          <section id="project" ref={sceneRef} className="scroll-scene">
            {isMobileLayout ? (
              <MobilePage
                works={works}
                copy={copy}
                petSessionKey={petSessionKey}
                eagerPreview={eagerPreviewCards}
              />
            ) : (
              <DesktopScene
                progress={progress}
                works={works}
                copy={copy}
                petSessionKey={petSessionKey}
                eagerPreview={eagerPreviewCards}
              />
            )}
          </section>
          <AboutPanel copy={copy} />
        </main>
      </div>
    </>
  );
}
