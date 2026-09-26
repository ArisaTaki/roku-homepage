import {
  Bot,
  BookOpen,
  FileText,
  Clapperboard,
  Gem,
  Layers3,
  Mic,
  Palette,
  Images,
  ScanFace,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { Component, lazy, memo, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from "react";
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
import { waitForInitialAppReady, type InitialAppReadiness } from "./bootReadiness";
import { usePreparedPreviewImage } from "./usePreparedPreviewImage";
import { FestivalArtwork } from "./FestivalArtwork";
import { ProjectShowcase } from "./ProjectShowcase";
import projectReleaseData from "./data/project-releases.json";
import projectMainData from "./data/project-main.json";
import { currentFestivalArtwork } from "./festivalArtworkSource";
import { FLOW_LAYOUT_QUERY, PHONE_NAV_QUERY, getSceneLayout, type SceneLayout } from "./sceneLayout";
import { SCENE_PROGRESS_EVENT, useSceneMotion } from "./useSceneMotion";
import { askIrohaStream, type AssistantAnswerWithRuntime } from "./lib/iropAssistantClient";
import { preloadPreviewImage, previewImageUrl } from "./lib/previewImages";
import {
  loadGalleryReplay,
  loadHermesReplay,
  loadNatureLive2DReplay,
  loadShaderReplay,
  loadTsukuyomiThemePreview,
  preloadWorkPreview,
  isWorkPreviewReady,
  subscribeWorkPreview,
  schedulePreviewPreloads,
  prepareInitialScreen,
} from "./previewPreload";

const LOCALE_STORAGE_KEY = "irop-locale";
const IROHA_SESSION_STORAGE_PREFIX = "irop-iroha-session";
const FISH_BACKGROUND_MAX_PIXELS = 1_600_000;
const FISH_BACKGROUND_PROGRESS_EVENT = SCENE_PROGRESS_EVENT;
const projectReleases = projectReleaseData.projects as Partial<Record<WorkId, { version: string }>>;
const projectSnapshots = projectMainData.projects as Partial<Record<WorkId, { updatedAt: string }>>;

function ProjectUpdated({ id, locale }: { id: WorkId; locale: Locale }) {
  const updatedAt = projectSnapshots[id]?.updatedAt;
  if (!updatedAt) return null;
  const date = new Intl.DateTimeFormat({ zh: "zh-CN", en: "en-US", ja: "ja-JP" }[locale], {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai",
  }).format(new Date(updatedAt));
  return <span className="work-updated">{{ zh: "更新于", en: "Updated", ja: "更新" }[locale]} <time dateTime={updatedAt}>{date}</time></span>;
}

const HermesReplay = lazy(() => loadHermesReplay().then((module) => ({ default: module.HermesReplay })));
const NatureLive2DReplay = lazy(() => (
  loadNatureLive2DReplay().then((module) => ({ default: module.NatureLive2DReplay }))
));
const GalleryReplay = lazy(() => loadGalleryReplay().then((module) => ({ default: module.GalleryReplay })));
const ShaderReplay = lazy(() => loadShaderReplay().then((module) => ({ default: module.ShaderReplay })));
const TsukuyomiThemePreview = lazy(() => (
  loadTsukuyomiThemePreview().then((module) => ({ default: module.TsukuyomiThemePreview }))
));

type WorkBase = {
  id: WorkId;
  href?: string;
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
  onReady?: (status: InitialAppReadiness) => void;
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
    href: "https://www.npmjs.com/package/@kuguya-ai/nature-live2d",
    visual: "visual-live2d",
    width: 620,
    left: 2440,
  },
  {
    id: "tsukuyomi",
    href: "/previews/tsukuyomi/index.html",
    visual: "visual-tsukuyomi",
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
    visual: "visual-gallery",
    width: 594,
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
    id: "ranlu",
    href: "/previews/ranlu/index.html",
    width: 620,
    left: 6970,
  },
  {
    id: "jingang-guild",
    href: "/previews/jingang-guild/index.html",
    width: 620,
    left: 7910,
  },
  {
    id: "yki-video-generator",
    href: "https://github.com/kuguya-AI-app-develop/YKI-video-generator",
    width: 620,
    left: 8850,
  },
  {
    id: "naiwa-yuushiya",
    href: "/previews/naiwa-yuushiya/index.html",
    width: 620,
    left: 9790,
  },
  {
    id: "reflex-labs",
    width: 620,
    left: 10730,
  },
];

const workNavIcons: Record<WorkId, LucideIcon> = {
  "hermes-yachiyo": Bot,
  "nature-live2d": ScanFace,
  tsukuyomi: BookOpen,
  blog: FileText,
  gallery: Images,
  shader: Waves,
  ranlu: Palette,
  "jingang-guild": Gem,
  "yki-video-generator": Clapperboard,
  "naiwa-yuushiya": Layers3,
  "reflex-labs": Mic,
};

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

function useViewportSize(readingAnchorRef: RefObject<string>, resizeAnchorRef: RefObject<string | null>) {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight, anchor: "" }));
  useEffect(() => {
    let frame = 0;
    let measuredWidth = window.innerWidth;
    let measuredHeight = window.innerHeight;
    let measuredFlow = window.matchMedia(FLOW_LAYOUT_QUERY).matches;
    const update = () => {
      frame = 0;
      measuredWidth = window.innerWidth;
      measuredHeight = window.innerHeight;
      measuredFlow = window.matchMedia(FLOW_LAYOUT_QUERY).matches;
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
        // Flow-only height changes come from browser chrome during a swipe;
        // desktop height changes also alter the scaled exhibition coordinates.
        anchor: resizeAnchorRef.current ?? "",
      });
    };
    const schedule = () => {
      // Capture the previous reading position before a media query swaps the
      // scene. Keep it frozen across successive events until restoration ends.
      const nextFlow = window.matchMedia(FLOW_LAYOUT_QUERY).matches;
      const changedWidth = Math.abs(measuredWidth - window.innerWidth) > 2;
      const changedHeight = Math.abs(measuredHeight - window.innerHeight) > 2;
      if (changedWidth || (changedHeight && (!measuredFlow || !nextFlow))) {
        resizeAnchorRef.current ??= readingAnchorRef.current;
      }
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [readingAnchorRef, resizeAnchorRef]);
  return size;
}

function prepareWorkPreview(id: WorkId): void {
  void preloadWorkPreview(id).catch(() => {
    // The card keeps its static preview if optional resources are unavailable.
  });
}

function useHasEnteredViewport<T extends Element>(workId: WorkId, prepared = false): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (hasEntered || prepared) return undefined;

    const node = ref.current;
    if (!node) return undefined;

    if (!("IntersectionObserver" in window)) {
      prepareWorkPreview(workId);
      setHasEntered(true);
      return undefined;
    }

    // Warm the next card ahead of time, but mount its runtime only when visible.
    // The desktop stage clips its track and must be the observers' explicit root.
    const stage = node.closest(".stage");
    let stageIsVisible = !stage;
    let previewIsNear = false;
    let previewIsVisible = false;
    let hasPrepared = false;
    let stageObserver: IntersectionObserver | undefined;
    const revealIfVisible = () => {
      if (!stageIsVisible) return;
      if (!hasPrepared && (previewIsNear || previewIsVisible)) {
        hasPrepared = true;
        prepareWorkPreview(workId);
      }
      if (!previewIsVisible) return;
      setHasEntered(true);
      nearObserver.disconnect();
      visibleObserver.disconnect();
      stageObserver?.disconnect();
    };
    const nearObserver = new IntersectionObserver(([entry]) => {
      previewIsNear = entry?.isIntersecting ?? false;
      revealIfVisible();
    }, { root: stage, rootMargin: "500px 800px", threshold: 0.01 });
    const visibleObserver = new IntersectionObserver(([entry]) => {
      previewIsVisible = Boolean(
        entry?.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0
      );
      revealIfVisible();
    }, { root: stage, rootMargin: "0px", threshold: 0.01 });

    if (stage) {
      // An explicit root can intersect its children while it is offscreen.
      stageObserver = new IntersectionObserver(([entry]) => {
        stageIsVisible = Boolean(
          entry?.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0
        );
        revealIfVisible();
      }, { threshold: 0.01 });
      stageObserver.observe(stage);
    }

    nearObserver.observe(node);
    visibleObserver.observe(node);
    return () => {
      nearObserver.disconnect();
      visibleObserver.disconnect();
      stageObserver?.disconnect();
    };
  }, [hasEntered, prepared, workId]);

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

function LightFishBackground({ progressRef }: { progressRef: RefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) return undefined;
    const waterCanvas = document.createElement("canvas");
    const waterContext = waterCanvas.getContext("2d", { alpha: true });

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

    // These three full-screen gradients depend only on viewport geometry.
    // Preserve their original source-over → screen composition in one bitmap.
    const drawStaticWater = (target: CanvasRenderingContext2D) => {
      target.save();
      target.globalCompositeOperation = "source-over";
      const vignette = target.createRadialGradient(
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
      target.fillStyle = vignette;
      target.fillRect(0, 0, width, height);

      target.globalCompositeOperation = "screen";
      const topWash = target.createLinearGradient(0, 0, 0, height);
      topWash.addColorStop(0, "rgba(184, 248, 255, 0.18)");
      topWash.addColorStop(0.12, "rgba(255, 244, 184, 0.08)");
      topWash.addColorStop(0.34, "rgba(104, 204, 220, 0.035)");
      topWash.addColorStop(0.72, "rgba(104, 204, 220, 0)");
      target.fillStyle = topWash;
      target.fillRect(0, 0, width, height);

      const bloom = target.createRadialGradient(
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
      target.fillStyle = bloom;
      target.fillRect(0, 0, width, height);
      target.restore();
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelBudgetRatio = Math.sqrt(FISH_BACKGROUND_MAX_PIXELS / Math.max(1, width * height));
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1, pixelBudgetRatio);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      waterCanvas.width = canvas.width;
      waterCanvas.height = canvas.height;
      if (waterContext) {
        waterContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        drawStaticWater(waterContext);
      }

      const areaCount = Math.floor((width * height) / (width < 760 ? 5600 : 7200));
      const targetCount = reduceMotion.matches
        ? 48
        : width < 760
          ? Math.min(170, Math.max(96, areaCount))
          : Math.min(240, Math.max(140, areaCount));
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
      if (waterContext && waterCanvas.width > 0 && waterCanvas.height > 0) {
        // Map the cached pixels 1:1 under the main canvas's pixel-ratio transform.
        context.drawImage(waterCanvas, 0, 0, waterCanvas.width / pixelRatio, waterCanvas.height / pixelRatio);
      } else {
        drawStaticWater(context);
      }

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
      if (moved) scheduleRender(true);
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

function FestivalWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`festival-wordmark ${className}`} aria-label="HacchiRoku">
      <span>Hacchi</span>
      <span>Roku<b aria-hidden="true">!</b></span>
    </div>
  );
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
  const image = usePreparedPreviewImage("/assets/pet/iroha/spritesheet.webp", { prepare: true, priority: "high" });
  return <span className={`pixel-pet ${className}`} data-mood={mood} data-image-ready={Boolean(image)}
    style={{ backgroundImage: image ? `url("${image}")` : "none" }} aria-hidden="true" />;
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
        <div
          className="pet-messages"
          aria-live="polite"
          aria-busy={isThinking}
          data-lenis-prevent-wheel
          ref={messagesRef}
        >
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

function AboutColumns({ copy, contactId }: { copy: UiCopy; contactId?: string }) {
  return (
    <div className="about-columns" aria-label={copy.aboutColumnsAria}>
      {copy.aboutColumns.map((column) => {
        const isContact = "beforeEmail" in column;
        return (
          <article id={isContact ? contactId : undefined} key={column.title}>
            <h3>{column.title}</h3>
            {"body" in column ? (
              <p>{column.body}</p>
            ) : (
              <p>
                {column.beforeEmail} <a href="mailto:me@irop.one">me@irop.one</a>. {column.afterEmail}
              </p>
            )}
          </article>
        );
      })}
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
          <img src={previewImageUrl("/assets/hermes/logo.png")} alt="" loading="lazy" decoding="async" />
          Hermes Yachiyo
        </b>
      </div>
      <div className="hm-body">
        <aside className="hm-rail">
          <img src={previewImageUrl("/assets/hermes/logo.png")} alt="" loading="lazy" decoding="async" />
          {copy.nav.map((item, index) => (
            <span className={index === 0 ? "is-active" : ""} key={item}>
              {item}
            </span>
          ))}
        </aside>
        <main className="hm-panel">
          <header>
            <img src={previewImageUrl("/assets/hermes/yachiyo-default.jpg")} alt="" loading="lazy" decoding="async" />
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
  const poster = work.id === "hermes-yachiyo"
    ? "/assets/hermes/yachiyo-default.jpg"
    : work.id === "nature-live2d"
      ? "/models/yachiyo-web/avatar.webp"
      : work.id === "gallery"
        ? "/assets/gallery-new/cover-kaguya.webp"
        : "";
  const preparedPoster = usePreparedPreviewImage(poster);

  return (
    <div ref={previewRef} className={`work-preview-loading ${work.visual ?? ""}`} aria-hidden="true">
      <div className="work-preview-art">
        {preparedPoster ? (
          <img
            className="work-preview-poster"
            src={preparedPoster}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
          />
        ) : <div className="work-preview-shader-orb" />}
      </div>
      <div className="work-preview-copy">
        <small>{work.meta.split(",")[0]}</small>
        <strong>{work.title}</strong>
        <p>{work.description}</p>
      </div>
    </div>
  );
}

class WorkPreviewBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function DeferredWorkPreview({
  work,
  children,
}: {
  work: Work;
  children: ReactNode;
}) {
  const [preparedWork, setPreparedWork] = useState(() => isWorkPreviewReady(work.id));
  const canPremount = preparedWork && work.id !== "nature-live2d";
  const [ref, hasEntered] = useHasEnteredViewport<HTMLDivElement>(work.id, canPremount);
  const needsImages = work.id === "hermes-yachiyo" || work.id === "gallery";
  const fallback = <WorkVisualLoading work={work} />;

  useEffect(() => {
    const update = () => setPreparedWork(isWorkPreviewReady(work.id));
    const unsubscribe = subscribeWorkPreview(work.id, update);
    update();
    if (hasEntered) prepareWorkPreview(work.id);
    return unsubscribe;
  }, [hasEntered, work.id]);

  // Lightweight players build their initial DOM behind the opening. Keep the
  // Live2D renderer deferred so background byte warming cannot initialize WebGL.
  if ((!hasEntered && !canPremount) || (needsImages && !preparedWork)) {
    return <WorkVisualLoading work={work} previewRef={ref} />;
  }

  return (
    <WorkPreviewBoundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </WorkPreviewBoundary>
  );
}

function PreparedWorkImage({ work }: { work: Work }) {
  const [ref, hasEntered] = useHasEnteredViewport<HTMLImageElement>(work.id);
  const image = usePreparedPreviewImage(work.image!, { prepare: hasEntered });
  return <img ref={ref} src={image} alt="" decoding="async" />;
}

function WorkVisual({
  work,
  copy,
  layout,
  locale,
  playing,
}: {
  work: Work;
  copy: UiCopy;
  layout: "desktop" | "mobile";
  locale: Locale;
  playing?: boolean;
}) {
  if (work.image) {
    return <PreparedWorkImage work={work} />;
  }

  if (["ranlu", "jingang-guild", "yki-video-generator", "naiwa-yuushiya", "reflex-labs"].includes(work.id)) {
    return <ProjectShowcase id={work.id} locale={locale} />;
  }

  if (work.visual === "visual-hermes") {
    return (
      <DeferredWorkPreview work={work}>
        <HermesReplay playing={playing} />
      </DeferredWorkPreview>
    );
  }

  if (work.visual === "visual-live2d") {
    return (
      <DeferredWorkPreview work={work}>
        <NatureLive2DReplay playing={playing} />
      </DeferredWorkPreview>
    );
  }

  if (work.visual === "visual-gallery") {
    return (
      <DeferredWorkPreview work={work}>
        <GalleryReplay playing={playing} />
      </DeferredWorkPreview>
    );
  }

  if (work.visual === "visual-shader") {
    return (
      <DeferredWorkPreview work={work}>
        <ShaderReplay playing={playing} />
      </DeferredWorkPreview>
    );
  }

  if (work.visual === "visual-tsukuyomi") {
    return (
      <DeferredWorkPreview work={work}>
        <TsukuyomiThemePreview playing={playing} locale={locale} />
      </DeferredWorkPreview>
    );
  }

  return <WorkVisualPlaceholder work={work} />;
}

const MemoPetAssistant = memo(PetAssistant);

const DesktopWorkCard = memo(function DesktopWorkCard({
  work,
  copy,
  locale,
  index,
  total,
}: {
  work: Work;
  copy: UiCopy;
  locale: Locale;
  index: number;
  total: number;
}) {
  const href = workHref(work, locale);
  const external = href?.startsWith("http");
  const Card = href ? "a" : "article";
  return (
    <Card
      className={workCardClass("work-card", work)}
      data-work-id={work.id}
      data-exhibit-number={String(index + 1).padStart(2, "0")}
      href={href}
      tabIndex={href ? undefined : 0}
      style={{ left: `${work.left}px`, width: `${work.width}px` }}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      onFocus={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        prepareWorkPreview(work.id);
        if (!event.target.matches(":focus-visible")) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        if (bounds.width > window.innerWidth - 48) return;
        if (bounds.left >= 24 && bounds.right <= window.innerWidth - 24) return;

        const anchor = document.getElementById(`work-${work.id}`);
        if (anchor?.classList.contains("project-scroll-anchor")) {
          anchor.scrollIntoView({ block: "start", behavior: "instant" });
        }
      }}
    >
      <div className="work-overline" aria-hidden="true">
        <span className="work-number">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span className="work-category">{work.meta.split(",")[0]}</span>
      </div>
      <WorkVisual work={work} copy={copy} layout="desktop" locale={locale} />
      <div className="work-heading">
        <h2>{work.title}</h2>
        {href && <span className="work-open-arrow" aria-hidden="true">↗</span>}
      </div>
      <p>{work.description}</p>
      <small>{work.status && <b className="work-status">{work.status}</b>}{projectReleases[work.id] && <b className="work-status">{projectReleases[work.id]?.version}</b>}{work.meta}<ProjectUpdated id={work.id} locale={locale} /></small>
    </Card>
  );
});

function workCardClass(baseClass: string, work: Work): string {
  return `${baseClass} ${work.visual === "visual-hermes" ? "is-hermes" : ""} ${
    work.visual === "visual-live2d" ? "is-nature-live2d" : ""
  } ${
    work.visual === "visual-gallery" ? "is-gallery" : ""
  } ${
    work.visual === "visual-shader" ? "is-shader" : ""
  } ${
    work.visual === "visual-tsukuyomi" ? "is-tsukuyomi" : ""
  } ${
    work.square ? "square" : ""
  } ${work.short ? "short" : ""}`;
}

function workHref(work: Work, locale: Locale): string | undefined {
  return work.href?.startsWith("/previews/") ? `${work.href}?lang=${locale}` : work.href;
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
  flow,
  progressRef,
  travel,
  works,
  locale,
  onLocaleChange,
  copy,
}: {
  flow: boolean;
  progressRef: RefObject<number>;
  travel: number;
  works: Work[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  copy: UiCopy;
}) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const [{ compact, showMini }, setPosition] = useState({ compact: false, showMini: false });

  useEffect(() => {
    const update = (nextCompact: boolean, nextMini: boolean) => {
      setPosition((current) => current.compact === nextCompact && current.showMini === nextMini
        ? current : { compact: nextCompact, showMini: nextMini });
    };
    if (flow) {
      const node = navRef.current;
      if (!node) return;
      // The tablet card occupies its own hero cell. Show the home controls only
      // after that cell has scrolled away, without moving the remaining content.
      const observer = new IntersectionObserver(([entry]) => {
        const passed = entry.boundingClientRect.bottom <= 0;
        update(passed, passed);
      }, { threshold: 0 });
      observer.observe(node);
      return () => observer.disconnect();
    }
    const onProgress = () => {
      const progress = progressRef.current;
      const pastOpening = progress * travel > 728;
      update(pastOpening, pastOpening && progress < 1);
    };
    onProgress();
    window.addEventListener(SCENE_PROGRESS_EVENT, onProgress);
    return () => window.removeEventListener(SCENE_PROGRESS_EVENT, onProgress);
  }, [flow, progressRef, travel]);

  return (
    <div ref={navRef} className={`floating-navigation${flow ? " is-flow" : ""}`}>
      <a className={`mini-logo ${showMini ? "visible" : ""}`} href="#top" aria-label={copy.nav.home}>
        <HeroMark className="mini-name-mark" text="HacchiRoku" />
      </a>
      <nav className={`nav-card ${compact ? "compact" : ""}`} aria-label={copy.nav.primary}>
        <div className="nav-row nav-row-menu nav-row-works">
          <a
            className="nav-row-main"
            href={flow ? "#mobile-works" : `#work-${works[0].id}`}
            onMouseEnter={() => prepareWorkPreview(works[0].id)}
            onFocus={() => prepareWorkPreview(works[0].id)}
            onClick={() => prepareWorkPreview(works[0].id)}
          >
            <span>{copy.nav.works}</span>
            <span className="arrow">→</span>
          </a>
          <span className="icon-strip work-anchor-strip" aria-label={copy.nav.works}>
            {works.map((work) => {
              const WorkIcon = workNavIcons[work.id];
              return (
                <a
                  href={`#work-${work.id}`}
                  aria-label={`${copy.nav.works}: ${work.title}`}
                  title={work.title}
                  onMouseEnter={() => prepareWorkPreview(work.id)}
                  onFocus={() => prepareWorkPreview(work.id)}
                  onClick={() => prepareWorkPreview(work.id)}
                  key={work.id}
                >
                  <WorkIcon aria-hidden="true" />
                </a>
              );
            })}
          </span>
        </div>
        <div className="nav-row nav-row-menu">
          <a className="nav-row-main" href={flow ? "#mobile-about" : "#about"}>
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
        <a className="nav-row resume" href="#contact">
          <span>{copy.nav.email}</span>
          <span className="download">→</span>
        </a>
        <LanguageSwitcher locale={locale} onLocaleChange={onLocaleChange} label={copy.nav.language} />
      </nav>
      <a className={`where-card ${compact ? "visible" : ""}`} href="#top" aria-label={copy.nav.backHome}>
        <span aria-hidden="true">←</span>
        <span>{copy.nav.where}</span>
      </a>
    </div>
  );
}

function SiteNavigation({ works, locale, onLocaleChange, copy, flow }: {
  works: Work[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  copy: UiCopy;
  flow: boolean;
}) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <nav ref={navRef} className="site-nav" aria-label={copy.nav.primary}>
      <div className="site-nav-bar">
        <a href="#top" className="site-home" aria-label={copy.nav.home} onClick={() => setOpen(false)}>irop<span>.one</span></a>
        <LanguageSwitcher locale={locale} onLocaleChange={onLocaleChange} label={copy.nav.language} />
        <button ref={menuButton} className="site-menu-toggle" type="button" aria-expanded={open}
          aria-controls="site-menu" aria-label={open ? copy.nav.closeMenu : copy.nav.menu} onClick={() => setOpen(!open)}>
          <span>{copy.nav.menu}</span><b aria-hidden="true">{open ? "−" : "+"}</b>
        </button>
      </div>
      {open && <div id="site-menu" className="site-menu" data-lenis-prevent>
        <div className="site-menu-sections">
          <a href={flow ? "#mobile-works" : `#work-${works[0].id}`} onClick={() => setOpen(false)}>{copy.nav.works} ↗</a>
          <a href={flow ? "#mobile-about" : "#about"} onClick={() => setOpen(false)}>{copy.nav.me} ↗</a>
          <a href="#contact" onClick={() => setOpen(false)}>{copy.nav.email} ↗</a>
        </div>
        <div className="site-menu-works">
          {works.map((work, index) => <a key={work.id} href={`#work-${work.id}`}
            onMouseEnter={() => prepareWorkPreview(work.id)} onFocus={() => prepareWorkPreview(work.id)}
            onClick={() => { prepareWorkPreview(work.id); setOpen(false); }}>
            <span>{String(index + 1).padStart(2, "0")}</span>{work.title}<b aria-hidden="true">→</b>
          </a>)}
        </div>
      </div>}
    </nav>
  );
}

function MobileWorkCard({ work, copy, locale, index, total }: { work: Work; copy: UiCopy; locale: Locale; index: number; total: number }) {
  const [playing, setPlaying] = useState<boolean | undefined>(undefined);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const hasReplay = ["visual-hermes", "visual-live2d", "visual-gallery", "visual-shader", "visual-tsukuyomi"].includes(work.visual ?? "");
  const shouldPlay = playing ?? !reducedMotion;
  const href = workHref(work, locale);
  const external = href?.startsWith("http");
  const Heading = href ? "a" : "div";
  return (
    <article id={`work-${work.id}`} className={workCardClass("mobile-work", work)} data-work-id={work.id}
      data-exhibit-number={String(index + 1).padStart(2, "0")}>
      <div className="work-overline" aria-hidden="true">
        <span className="work-number">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span className="work-category">{work.meta.split(",")[0]}</span>
      </div>
      <WorkVisual work={work} copy={copy} layout="mobile" locale={locale} playing={playing} />
      {hasReplay && <div className="preview-controls">
        <span>{copy.preview.label}</span>
        <button type="button" aria-label={`${shouldPlay ? copy.preview.pause : copy.preview.play}: ${work.title}`}
          aria-pressed={shouldPlay} onClick={() => setPlaying(!shouldPlay)}>
          <span aria-hidden="true">{shouldPlay ? "Ⅱ" : "▷"}</span>{shouldPlay ? copy.preview.pause : copy.preview.play}
        </button>
      </div>}
      <Heading className="work-heading" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
        <h2>{work.title}</h2>{href && <span className="work-open-arrow" aria-hidden="true">↗</span>}
      </Heading>
      <p>{work.description}</p><small>{work.status && <b className="work-status">{work.status}</b>}{projectReleases[work.id] && <b className="work-status">{projectReleases[work.id]?.version}</b>}{work.meta}<ProjectUpdated id={work.id} locale={locale} /></small>
    </article>
  );
}

function DesktopProjectAnchors({ works, layout }: { works: Work[]; layout: SceneLayout }) {
  return (
    <div className="project-anchor-rail" aria-hidden="true">
      {works.map((work) => {
        const progress = clamp((work.left + work.width / 2 - layout.viewportWidth / 2) / layout.travel, 0, 1);
        return <span id={`work-${work.id}`} className="project-scroll-anchor"
          style={{ top: progress * layout.scrollRange }} key={work.id} />;
      })}
    </div>
  );
}

function DesktopScene({
  layout,
  activeIndex,
  works,
  copy,
  locale,
  petSessionKey,
}: {
  layout: SceneLayout;
  activeIndex: number;
  works: Work[];
  copy: UiCopy;
  locale: Locale;
  petSessionKey: string;
}) {
  return (
    <div className="stage" aria-label={copy.hero.stageAria} style={{
      "--scene-scale": layout.scale,
      "--scene-viewport-width": `${layout.viewportWidth}px`,
      "--scene-hero-offset": `${layout.heroOffset}px`,
    } as CSSProperties}>
      <div className="desktop-track" style={{ transform: `scale(${layout.scale})`, width: layout.trackWidth }}>
        <div className="desktop-hero">
        <div className="festival-backdrop" aria-hidden="true">
          <span className="festival-cloud cloud-one" />
          <span className="festival-cloud cloud-two" />
          <span className="festival-spark spark-one">✧</span>
          <span className="festival-spark spark-two">✧</span>
          <span className="festival-petals" />
        </div>
        <FestivalArtwork className="desktop-artwork" copy={copy.hero} resolutionScale={layout.scale} />
        <div className="hero-eyebrow"><span className="hero-signal" />{copy.hero.eyebrow}</div>
        <h1 className="desktop-title">irop.one</h1>
        <p className="desktop-intro">
          {copy.hero.intro[0]}
          <br />
          {copy.hero.intro[1]}
          <br />
          {copy.hero.intro[2]}
        </p>
        <FestivalWordmark className="desktop-festival-wordmark" />
        <p className="hero-caption">{copy.hero.caption}</p>
        <MemoPetAssistant className="hero-assistant" copy={copy.pet} sessionKey={petSessionKey} />
        <a
          className="this-way"
          href={`#work-${works[0].id}`}
          onMouseEnter={() => prepareWorkPreview(works[0].id)}
          onFocus={() => prepareWorkPreview(works[0].id)}
          onClick={() => prepareWorkPreview(works[0].id)}
        >
          <span>
            {copy.hero.thisWay[0]}{" "}
            <br />
            {copy.hero.thisWay[1]}
          </span>
          <b aria-hidden="true">→</b>
          <small>{copy.hero.exploreHint}</small>
        </a>
        </div>
        {works.map((work, index) => (
          <DesktopWorkCard work={work} copy={copy} locale={locale} index={index} total={works.length} key={work.id} />
        ))}
      </div>
      <nav className="exhibition-nav" aria-label={copy.hero.indexAria}>
        <div className="exhibition-position">
          <small>{copy.nav.works}</small>
          <span>{activeIndex < 0 ? copy.hero.prologue : works[activeIndex].title}</span>
        </div>
        <div className="exhibition-stops">
          {works.map((work, index) => (
            <a
              href={`#work-${work.id}`}
              className={index === activeIndex ? "is-active" : undefined}
              title={work.title}
              aria-label={work.title}
              aria-current={index === activeIndex ? "location" : undefined}
              onMouseEnter={() => prepareWorkPreview(work.id)}
              onFocus={() => prepareWorkPreview(work.id)}
              onClick={() => prepareWorkPreview(work.id)}
              key={work.id}
            >
              {String(index + 1).padStart(2, "0")}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}

function MobilePage({
  works,
  copy,
  locale,
  petSessionKey,
  navigation,
}: {
  works: Work[];
  copy: UiCopy;
  locale: Locale;
  petSessionKey: string;
  navigation?: ReactNode;
}) {
  return (
    <div className="mobile-page">
      <section className={`mobile-hero${navigation ? " has-floating-navigation" : ""}`} aria-labelledby="mobile-title">
        {navigation}
        <div className="festival-backdrop" aria-hidden="true">
          <span className="festival-cloud cloud-one" />
          <span className="festival-cloud cloud-two" />
          <span className="festival-spark spark-one">✧</span>
          <span className="festival-spark spark-two">✧</span>
          <span className="festival-petals" />
        </div>
        <div className="hero-eyebrow"><span className="hero-signal" />{copy.hero.eyebrow}</div>
        <h1 id="mobile-title">irop.one</h1>
        <p>
          {copy.hero.mobileIntro[0]}
          <br />
          {copy.hero.mobileIntro[1]}
          <br />
          {copy.hero.mobileIntro[2]}
        </p>
        <div className="mobile-logo-wrap">
          <FestivalWordmark className="mobile-festival-wordmark" />
        </div>
        <p className="hero-caption">{copy.hero.caption}</p>
        <FestivalArtwork className="mobile-artwork" copy={copy.hero} />
        <a className="mobile-this-way" href="#mobile-works">
          <span>
            {copy.hero.thisWay[0]}{" "}
            <br />
            {copy.hero.thisWay[1]}
          </span>
          <b aria-hidden="true">↓</b>
          <small>{copy.hero.exploreHint}</small>
        </a>
        <PetAssistant className="mobile-hero-assistant" compact copy={copy.pet} sessionKey={petSessionKey} />
      </section>
      <section id="mobile-works" className="mobile-works" aria-label={copy.nav.works}>
        {works.map((work, index) => (
          <MobileWorkCard work={work} copy={copy} locale={locale} index={index} total={works.length} key={work.id} />
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
        <AboutColumns copy={copy} contactId="contact" />
        <a className="mobile-mail" href="mailto:me@irop.one">
          me@irop.one
        </a>
      </section>
    </div>
  );
}

function AboutPanel({ copy, contactId }: { copy: UiCopy; contactId?: string }) {
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
        <AboutColumns copy={copy} contactId={contactId} />
      </div>
    </section>
  );
}

export default function App({ isBooting = false, onReady }: AppProps) {
  const [locale, setLocale] = useLocale();
  const appRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef(0);
  const readingAnchorRef = useRef("top");
  const resizeAnchorRef = useRef<string | null>(null);
  const viewport = useViewportSize(readingAnchorRef, resizeAnchorRef);
  const layout = useMemo(() => getSceneLayout(viewport.width, viewport.height, workShells[workShells.length - 1]), [viewport.width, viewport.height]);
  const isMobileLayout = useMediaQuery(FLOW_LAYOUT_QUERY);
  const isPhoneNavigation = useMediaQuery(PHONE_NAV_QUERY);
  const copy = uiCopy[locale];
  const petSessionKey = `${IROHA_SESSION_STORAGE_PREFIX}-${locale}`;
  const works = useMemo(() => workShells.map((work) => ({
    ...work, ...workCopies[locale][work.id], left: work.left + (isMobileLayout ? 0 : layout.workOffset),
  })), [locale, isMobileLayout, layout.workOffset]);
  const workCenters = useMemo(() => workShells.map((work) => work.left + layout.workOffset + work.width / 2), [layout.workOffset]);
  const activeIndex = useSceneMotion({
    sceneRef, layout, flow: isMobileLayout, enabled: !isBooting, workCenters, progressRef,
    readingAnchorRef, resizeAnchorRef,
  });

  useEffect(() => {
    if (!isBooting) return;
    const controller = new AbortController();
    const preparation = prepareInitialScreen().then(() => (
      preloadPreviewImage(currentFestivalArtwork().src, "high")
    ));
    let timedOut = false;
    let checking = false;
    const check = async () => {
      if (checking || controller.signal.aborted) return;
      checking = true;
      const status = await waitForInitialAppReady(appRef.current, controller.signal, preparation);
      checking = false;
      if (controller.signal.aborted) return;
      timedOut = status === "timeout";
      onReady?.(status);
      // Downloads can already be complete when a long frame stalls the paint
      // check. Keep observing recovery while visible, even without new I/O.
      if (timedOut && !document.hidden) void check();
    };
    void check();
    // A slow download may finish after the wait notice appears. Resume the
    // readiness check automatically rather than making the visitor reload it.
    const resume = () => { if (timedOut && !document.hidden) void check(); };
    void preparation.then(resume, resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", resume);
    };
  // A layout switch can remount the artwork at a higher resolution. Restart the
  // gate and confirm that current candidate after the shared opening queue.
  }, [isBooting, onReady, viewport.width, viewport.height]);

  useEffect(() => {
    if (isBooting) return;
    return schedulePreviewPreloads();
  }, [isBooting]);

  useEffect(() => {
    if (!viewport.anchor) return;
    const id = viewport.anchor === "about" && isMobileLayout ? "mobile-about" : viewport.anchor;
    const frame = window.requestAnimationFrame(() => {
      // Another resize may already be queued with newer scene dimensions.
      if (Math.abs(window.innerWidth - viewport.width) > 2
        || (!isMobileLayout && Math.abs(window.innerHeight - viewport.height) > 2)) return;
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
      readingAnchorRef.current = viewport.anchor;
      resizeAnchorRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewport, isMobileLayout]);

  const initialHashApplied = useRef(false);
  useEffect(() => {
    if (isBooting || initialHashApplied.current) return;
    initialHashApplied.current = true;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [isBooting]);

  return (
    <>
      {isPhoneNavigation
        ? <SiteNavigation works={works} locale={locale} onLocaleChange={setLocale} copy={copy} flow={isMobileLayout} />
        : !isMobileLayout && <FloatingNav works={works} locale={locale} onLocaleChange={setLocale} copy={copy} flow={false} progressRef={progressRef} travel={layout.travel} />}
      <div className={`app-shell ${isBooting ? "is-booting" : "is-ready"}`} ref={appRef} data-layout={isMobileLayout ? "flow" : "desktop"}>
        <LightFishBackground progressRef={progressRef} />
        <a className="skip-link" href={isMobileLayout ? "#mobile-works" : `#work-${works[0].id}`}>{copy.skip}</a>
        <div id="top" />
        <main>
          <section id="project" ref={sceneRef} className="scroll-scene" style={isMobileLayout ? undefined : { height: layout.sectionHeight }}>
            {isMobileLayout ? <MobilePage works={works} copy={copy} locale={locale} petSessionKey={petSessionKey}
              navigation={!isPhoneNavigation ? <FloatingNav works={works} locale={locale} onLocaleChange={setLocale}
                copy={copy} flow progressRef={progressRef} travel={layout.travel} /> : undefined} /> : (
              <>
                <DesktopProjectAnchors works={works} layout={layout} />
                <DesktopScene layout={layout} activeIndex={activeIndex} works={works} copy={copy} locale={locale} petSessionKey={petSessionKey} />
              </>
            )}
          </section>
          {!isMobileLayout && <AboutPanel copy={copy} contactId="contact" />}
        </main>
      </div>
    </>
  );
}
