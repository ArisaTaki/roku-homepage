import { Player, type PlayerRef } from "@remotion/player";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
} from "remotion";
import { useEffect, useRef, useState } from "react";

const FPS = 30;
const DURATION_IN_FRAMES = 360;
const COMPOSITION_WIDTH = 1280;
const COMPOSITION_HEIGHT = 880;
const LIVE2D_MODEL_URL = "/models/yachiyo-web/yachiyo.model3.json";
const CUBISM_CORE_URL = "/assets/vendor/live2dcubismcore.min.js";
const ACTING_START_FRAME = 82;
const ACTING_END_FRAME = 318;

declare global {
  interface Window {
    PIXI?: unknown;
    Live2DCubismCore?: unknown;
  }
}

type Live2DParameterTarget = {
  setParameterValueById?: (id: string, value: number, weight?: number) => void;
  internalModel?: {
    coreModel?: {
      setParameterValueById?: (id: string, value: number, weight?: number) => void;
    };
  };
  update?: (deltaMs: number) => void;
  anchor?: { set: (x: number, y?: number) => void };
  scale?: { set: (x: number, y?: number) => void };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  autoUpdate?: boolean;
  destroy?: (options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }) => void;
};

type PixiApplication = {
  stage: {
    addChild: (child: unknown) => void;
  };
  renderer: {
    resize: (width: number, height: number) => void;
    render: (stage: unknown) => void;
  };
  ticker?: {
    stop: () => void;
  };
  stop?: () => void;
  destroy: (removeView?: boolean, stageOptions?: { children?: boolean; texture?: boolean; baseTexture?: boolean }) => void;
};

let cubismCorePromise: Promise<void> | null = null;

type NatureDemoIntent = {
  emotion: string;
  intensity?: number;
  gaze?: string | null;
  head?: string | null;
  eyes?: string | null;
  brows?: string | null;
  mouth?: string | null;
  specialExpression?: string | null;
  durationMs?: number;
};

type NatureDemoTimeline = {
  emotion: string;
  intensity: number;
  durationMs: number;
  keyframes: Array<{
    t: number;
    params: Record<string, number>;
  }>;
  warnings: string[];
};

type NatureDemoParam = {
  id: string;
  value: number;
  min: number;
  max: number;
};

type NatureDemoBeat = {
  id: string;
  label: string;
  inputText: string;
  intent: NatureDemoIntent;
  timeline: NatureDemoTimeline;
  sampleAtMs: number;
  sampleParams: Record<string, number>;
  params: NatureDemoParam[];
  adapterParams: string[];
  warnings: string[];
};

type NatureDemoData = {
  inputText: string;
  runtime: string;
  runtimeLabel: string;
  analyzerLabel: string;
  characterName: string;
  intent: NatureDemoIntent;
  timeline: NatureDemoTimeline;
  sampleAtMs: number;
  sampleParams: Record<string, number>;
  params: NatureDemoParam[];
  adapterParams: string[];
  beats: NatureDemoBeat[];
  warnings: string[];
  note: string;
};

type NatureLive2DCompositionProps = {
  data?: NatureDemoData;
  enableLive2D?: boolean;
};

const DEFAULT_DEMO_DATA: NatureDemoData = {
  inputText: "咦？这个表情真的会跟着一句话变化吗……刚刚有点被吓到。可是没关系，我会认真听你说，也会陪你把这段流程跑完。嗯，现在放心啦，我们一起笑一下吧。",
  runtime: "nature-live2d-fallback",
  runtimeLabel: "NATURE ENGINE",
  analyzerLabel: "MockEmotionAnalyzer",
  characterName: "【雪熊企划】八千代辉夜姬",
  intent: {
    emotion: "shy",
    intensity: 0.7,
    gaze: "down_right",
    mouth: "small_smile",
    specialExpression: "none",
    durationMs: 1200,
  },
  timeline: {
    emotion: "shy",
    intensity: 0.7,
    durationMs: 1200,
    keyframes: [
      { t: 0, params: {} },
      {
        t: 300,
        params: {
          ParamAngleY: -2.1,
          ParamAngleZ: 2.1,
          ParamEyeLOpen: 0.825,
          ParamEyeROpen: 0.825,
          ParamEyeBallX: 0.25,
          ParamEyeBallY: -0.25,
          ParamBrowLY: 0.105,
          ParamBrowRY: 0.105,
          ParamMouthForm: 0.35,
          ParamMouthOpenY: 0.05,
          ParamCheek: 0.525,
        },
      },
      {
        t: 900,
        params: {
          ParamAngleY: -2.1,
          ParamAngleZ: 2.1,
          ParamEyeLOpen: 0.825,
          ParamEyeROpen: 0.825,
          ParamEyeBallX: 0.25,
          ParamEyeBallY: -0.25,
          ParamBrowLY: 0.105,
          ParamBrowRY: 0.105,
          ParamMouthForm: 0.35,
          ParamMouthOpenY: 0.05,
          ParamCheek: 0.525,
        },
      },
      {
        t: 1200,
        params: {
          ParamAngleY: -2.1,
          ParamAngleZ: 2.1,
          ParamEyeLOpen: 0.825,
          ParamEyeROpen: 0.825,
          ParamEyeBallX: 0.25,
          ParamEyeBallY: -0.25,
          ParamBrowLY: 0.105,
          ParamBrowRY: 0.105,
          ParamMouthForm: 0.35,
          ParamMouthOpenY: 0.05,
          ParamCheek: 0.525,
        },
      },
    ],
    warnings: [],
  },
  sampleAtMs: 300,
  sampleParams: {
    ParamAngleY: -2.1,
    ParamAngleZ: 2.1,
    ParamEyeLOpen: 0.825,
    ParamEyeROpen: 0.825,
    ParamEyeBallX: 0.25,
    ParamEyeBallY: -0.25,
    ParamBrowLY: 0.105,
    ParamBrowRY: 0.105,
    ParamMouthForm: 0.35,
    ParamMouthOpenY: 0.05,
    ParamCheek: 0.525,
  },
  params: [
    { id: "ParamAngleY", value: -2.1, min: -30, max: 30 },
    { id: "ParamAngleZ", value: 2.1, min: -30, max: 30 },
    { id: "ParamEyeLOpen", value: 0.825, min: 0, max: 2 },
    { id: "ParamEyeROpen", value: 0.825, min: 0, max: 2 },
    { id: "ParamEyeBallX", value: 0.25, min: -1, max: 1 },
    { id: "ParamEyeBallY", value: -0.25, min: -1, max: 1 },
    { id: "ParamMouthForm", value: 0.35, min: -1, max: 1 },
    { id: "ParamMouthOpenY", value: 0.05, min: 0, max: 1 },
    { id: "ParamCheek", value: 0.525, min: 0, max: 1 },
  ],
  adapterParams: ["ParamAngleY", "ParamEyeBallX", "ParamMouthForm", "ParamCheek"],
  beats: [],
  warnings: [],
  note: "Fallback demo data until the local nature-live2d engine responds.",
};

function range(frame: number, input: number[], output: number[]): number {
  return interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
}

function stepProgress(frame: number, start: number, end: number): number {
  return range(frame, [start, end], [0, 1]);
}

function typeText(frame: number, start: number, end: number, text: string): string {
  const count = Math.floor(range(frame, [start, end], [0, text.length]));
  return text.slice(0, count);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function singleBeatFromData(data: NatureDemoData): NatureDemoBeat {
  return {
    id: data.intent.emotion || "single",
    label: data.intent.emotion || "表达",
    inputText: data.inputText,
    intent: data.intent,
    timeline: data.timeline,
    sampleAtMs: data.sampleAtMs,
    sampleParams: data.sampleParams,
    params: data.params,
    adapterParams: data.adapterParams,
    warnings: data.warnings,
  };
}

function beatsFor(data: NatureDemoData): NatureDemoBeat[] {
  return data.beats?.length ? data.beats : [singleBeatFromData(data)];
}

function readCubismCore(): unknown {
  if (typeof window === "undefined") return undefined;
  if (window.Live2DCubismCore) return window.Live2DCubismCore;

  try {
    const core = window.Function("return typeof Live2DCubismCore !== 'undefined' ? Live2DCubismCore : undefined")();
    if (core) window.Live2DCubismCore = core;
    return core;
  } catch {
    return undefined;
  }
}

function isCubismCoreReady(): boolean {
  const core = readCubismCore() as { Moc?: unknown; Model?: unknown } | undefined;
  return Boolean(core?.Moc && core?.Model);
}

function waitForCubismCoreReady(): Promise<void> {
  if (isCubismCoreReady()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      if (isCubismCoreReady()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt > 15_000) {
        reject(new Error("Live2D Cubism Core loaded but was not initialized"));
        return;
      }

      window.setTimeout(tick, 50);
    };

    tick();
  });
}

function ensureCubismCore(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (isCubismCoreReady()) return Promise.resolve();
  if (cubismCorePromise) return cubismCorePromise;

  cubismCorePromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${CUBISM_CORE_URL}"]`);

    if (existingScript?.dataset.loaded === "true") {
      void waitForCubismCoreReady().then(resolve, reject);
      return;
    }

    const script = existingScript ?? document.createElement("script");
    script.src = CUBISM_CORE_URL;
    script.async = true;
    script.dataset.loaded = "false";
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      void waitForCubismCoreReady().then(resolve, reject);
    }, { once: true });
    script.addEventListener("error", () => {
      cubismCorePromise = null;
      reject(new Error("Unable to load Live2D Cubism Core"));
    }, { once: true });

    if (!existingScript) document.head.appendChild(script);
  });

  return cubismCorePromise;
}

function applyParamsToLive2DModel(model: Live2DParameterTarget, params: Record<string, number>, weight = 1): void {
  const setter =
    model.setParameterValueById?.bind(model) ??
    model.internalModel?.coreModel?.setParameterValueById?.bind(model.internalModel.coreModel);

  if (!setter) return;

  for (const [id, value] of Object.entries(params)) {
    if (Number.isFinite(value)) setter(id, value, weight);
  }
}

function mixParam(baseValue: number, targetValue: number, progress: number): number {
  return baseValue + (targetValue - baseValue) * progress;
}

function buildLive2DParams(beat: NatureDemoBeat, frame: number, expression: number): Record<string, number> {
  const params = { ...beat.sampleParams };
  const breathe = 0.55 + Math.sin(frame / 18) * 0.12;
  const blink = frame % 96 > 88 ? 0.28 : 0.96;
  const emotion = beat.intent.emotion;
  const beatId = beat.id || emotion;

  params.ParamBreath = breathe;
  params.ParamExpression_1 = 0;
  params.ParamExpression_2 = 0;
  params.ParamExpression_3 = 0;
  params.ParamExpression_4 = 0;
  params.ParamHide_EyesL1 = 0;
  params.ParamHighLightHide_EyesL1 = 0;
  params.ParamHide_EyeSocket = 0;
  params.ParamHide_EyeSocket2 = 0;
  params.ParamEyeLOpen = mixParam(params.ParamEyeLOpen ?? blink, blink, 0.72);
  params.ParamEyeROpen = mixParam(params.ParamEyeROpen ?? blink, blink, 0.72);

  if (beatId === "surprised" || emotion === "surprised" || emotion === "panic") {
    params.ParamAngleY = mixParam(params.ParamAngleY ?? 0, 4.5, expression);
    params.ParamEyeLOpen = mixParam(params.ParamEyeLOpen ?? 1, 1.62, expression);
    params.ParamEyeROpen = mixParam(params.ParamEyeROpen ?? 1, 1.62, expression);
    params.ParamBrowLY = mixParam(params.ParamBrowLY ?? 0, 0.9, expression);
    params.ParamBrowRY = mixParam(params.ParamBrowRY ?? 0, 0.9, expression);
    params.ParamMouthOpenY = mixParam(params.ParamMouthOpenY ?? 0.05, 0.72, expression);
    params.ParamMouthForm = mixParam(params.ParamMouthForm ?? 0, -0.18, expression);
  }

  if (beatId === "sad" || emotion === "sad" || emotion === "crying") {
    params.ParamExpression_1 = mixParam(params.ParamExpression_1 ?? 0, 0.78, expression);
    params.ParamExpression_2 = mixParam(params.ParamExpression_2 ?? 0, 0.36, expression);
    params.ParamAngleY = mixParam(params.ParamAngleY ?? 0, -7.5, expression);
    params.ParamAngleZ = mixParam(params.ParamAngleZ ?? 0, -3.2, expression);
    params.ParamEyeLOpen = mixParam(params.ParamEyeLOpen ?? 1, 0.62, expression);
    params.ParamEyeROpen = mixParam(params.ParamEyeROpen ?? 1, 0.62, expression);
    params.ParamBrowLY = mixParam(params.ParamBrowLY ?? 0, -0.72, expression);
    params.ParamBrowRY = mixParam(params.ParamBrowRY ?? 0, -0.72, expression);
    params.ParamMouthForm = mixParam(params.ParamMouthForm ?? 0, -0.62, expression);
  }

  if (beatId === "caring" || emotion === "concerned" || emotion === "gentle") {
    params.ParamAngleY = mixParam(params.ParamAngleY ?? 0, -2.4, expression);
    params.ParamAngleZ = mixParam(params.ParamAngleZ ?? 0, 2.6, expression);
    params.ParamEyeLOpen = mixParam(params.ParamEyeLOpen ?? 1, 0.84, expression);
    params.ParamEyeROpen = mixParam(params.ParamEyeROpen ?? 1, 0.84, expression);
    params.ParamBrowLY = mixParam(params.ParamBrowLY ?? 0, 0.25, expression);
    params.ParamBrowRY = mixParam(params.ParamBrowRY ?? 0, 0.25, expression);
    params.ParamMouthForm = mixParam(params.ParamMouthForm ?? 0, 0.48, expression);
    params.ParamCheek = mixParam(params.ParamCheek ?? 0, 0.28, expression);
  }

  if (beatId === "happy" || emotion === "happy" || emotion === "joy") {
    params.ParamExpression_3 = mixParam(params.ParamExpression_3 ?? 0, 1, expression);
    params.ParamHide_EyesL1 = mixParam(params.ParamHide_EyesL1 ?? 0, 0.92, expression);
    params.ParamHighLightHide_EyesL1 = mixParam(params.ParamHighLightHide_EyesL1 ?? 0, 0.92, expression);
    params.ParamHide_EyeSocket = mixParam(params.ParamHide_EyeSocket ?? 0, 0.92, expression);
    params.ParamHide_EyeSocket2 = mixParam(params.ParamHide_EyeSocket2 ?? 0, 0.92, expression);
    params.ParamMouthForm = mixParam(params.ParamMouthForm ?? 0, 0.96, expression);
    params.ParamMouthOpenY = mixParam(params.ParamMouthOpenY ?? 0.05, 0.28, expression);
    params.ParamCheek = mixParam(params.ParamCheek ?? 0, 0.68, expression);
  }

  return params;
}

function blendParamRecords(
  from: Record<string, number>,
  to: Record<string, number>,
  amount: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of keys) {
    const fromValue = from[key];
    const toValue = to[key];

    if (fromValue == null) {
      result[key] = toValue;
    } else if (toValue == null) {
      result[key] = fromValue;
    } else {
      result[key] = mixParam(fromValue, toValue, amount);
    }
  }

  return result;
}

function continuousActingState(data: NatureDemoData, frame: number) {
  const beats = beatsFor(data);

  if (beats.length <= 1) {
    const beat = beats[0];
    const expression = stepProgress(frame, 124, 184);
    const params = buildLive2DParams(beat, frame, expression);

    return {
      beat,
      beats,
      index: 0,
      nextBeat: beat,
      nextIndex: 0,
      progress: stepProgress(frame, ACTING_START_FRAME, ACTING_END_FRAME),
      localProgress: 0,
      transitionProgress: 0,
      expression,
      params,
    };
  }

  const progress = stepProgress(frame, ACTING_START_FRAME, ACTING_END_FRAME);
  const position = progress * (beats.length - 1);
  const index = Math.min(beats.length - 1, Math.floor(position));
  const nextIndex = Math.min(beats.length - 1, index + 1);
  const localProgress = nextIndex === index ? 0 : position - index;
  const transitionProgress = nextIndex === index ? 0 : smoothstep((localProgress - 0.42) / 0.58);
  const expression = stepProgress(frame, ACTING_START_FRAME + 8, ACTING_START_FRAME + 34);
  const beat = transitionProgress > 0.5 ? beats[nextIndex] : beats[index];
  const fromParams = buildLive2DParams(beats[index], frame, expression);
  const toParams = buildLive2DParams(beats[nextIndex], frame, expression);

  return {
    beat,
    beats,
    index,
    nextBeat: beats[nextIndex],
    nextIndex,
    progress,
    localProgress,
    transitionProgress,
    expression,
    params: blendParamRecords(fromParams, toParams, transitionProgress),
  };
}

function displayParamsForState(state: ReturnType<typeof continuousActingState>): NatureDemoParam[] {
  const sourceParams = [...state.beat.params, ...state.nextBeat.params];
  const seen = new Set<string>();
  const params: NatureDemoParam[] = [];

  for (const param of sourceParams) {
    if (seen.has(param.id)) continue;
    seen.add(param.id);
    params.push({
      ...param,
      value: state.params[param.id] ?? param.value,
    });
  }

  return params.slice(0, 10);
}

function fitLive2DModel(model: Live2DParameterTarget, width: number, height: number): void {
  model.scale?.set(1);
  const modelWidth = Math.max(1, model.width ?? 1);
  const modelHeight = Math.max(1, model.height ?? 1);
  const scale = Math.min(width / modelWidth, height / modelHeight) * 2.32;

  model.anchor?.set(0.5, 0.22);
  model.scale?.set(scale);
  model.x = width * 0.5;
  model.y = height * 0.23;
}

function NatureCursor() {
  const frame = useCurrentFrame();
  const x = range(frame, [0, 46, 76, 114, 156, 204, 260], [978, 840, 840, 892, 1022, 1010, 1038]);
  const y = range(frame, [0, 46, 76, 114, 156, 204, 260], [686, 686, 686, 282, 452, 652, 652]);
  const clickFrames = [76, 156, 260];
  const clickPress = Math.max(
    ...clickFrames.map((clickFrame) => (
      frame >= clickFrame && frame <= clickFrame + 10
        ? spring({
          frame: frame - clickFrame,
          fps: FPS,
          config: { damping: 18, stiffness: 220 },
        })
        : 0
    )),
  );

  return (
    <div
      className="nl2d-cursor"
      style={{ transform: `translate(${x}px, ${y}px) scale(${1 - clickPress * 0.12})` }}
    >
      <span />
    </div>
  );
}

function Live2DPlaceholderStage({ data }: { data: NatureDemoData }) {
  return (
    <section className="nl2d-stage">
      <div className="nl2d-stage-grid" aria-hidden="true" />
      <div className="nl2d-model-card nl2d-model-card-placeholder">
        <span className="nl2d-model-aura" />
        <img src="/models/yachiyo-web/avatar.webp" alt="" />
        <span className="nl2d-runtime-badge">real Cubism ready</span>
      </div>
      <div className="nl2d-stage-meta">
        <b>{data.characterName}</b>
        <span>moc3 · texture · physics · expression params</span>
      </div>
    </section>
  );
}

function Live2DModelStage({ data, enabled }: { data: NatureDemoData; enabled: boolean }) {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageCardRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplication | null>(null);
  const modelRef = useRef<Live2DParameterTarget | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<"loading" | "ready" | "error">("loading");
  const actingState = continuousActingState(data, frame);
  const emotion = actingState.beat.intent.emotion;
  const expressionClass = `is-beat-${actingState.beat.id} is-emotion-${emotion}`;

  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const setupLive2D = async () => {
      const canvas = canvasRef.current;
      const stageCard = stageCardRef.current;
      if (!canvas || !stageCard) return;

      try {
        await ensureCubismCore();
        const PIXI = await import("pixi.js");
        window.PIXI = PIXI;
        const { Live2DModel } = await import("pixi-live2d-display/cubism4");

        if (disposed) return;

        Live2DModel.registerTicker(PIXI.Ticker);

        const rect = stageCard.getBoundingClientRect();
        const width = Math.max(320, Math.round(rect.width || 360));
        const height = Math.max(420, Math.round(rect.height || 620));
        const app = new PIXI.Application({
          view: canvas,
          width,
          height,
          autoDensity: true,
          antialias: true,
          backgroundAlpha: 0,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
        }) as unknown as PixiApplication;

        app.stop?.();
        app.ticker?.stop();

        const model = await Live2DModel.from(LIVE2D_MODEL_URL, {
          autoInteract: false,
          autoUpdate: false,
        } as never) as unknown as Live2DParameterTarget;

        if (disposed) {
          model.destroy?.({ children: true, texture: true, baseTexture: true });
          app.destroy(false, { children: true, texture: true, baseTexture: true });
          return;
        }

        model.autoUpdate = false;
        app.stage.addChild(model);
        fitLive2DModel(model, width, height);
        app.renderer.render(app.stage);

        appRef.current = app;
        modelRef.current = model;
        setRuntimeStatus("ready");

        resizeObserver = new ResizeObserver(([entry]) => {
          const nextWidth = Math.max(320, Math.round(entry.contentRect.width || width));
          const nextHeight = Math.max(420, Math.round(entry.contentRect.height || height));
          app.renderer.resize(nextWidth, nextHeight);
          fitLive2DModel(model, nextWidth, nextHeight);
          app.renderer.render(app.stage);
        });
        resizeObserver.observe(stageCard);
      } catch (error) {
        if (!disposed) {
          console.error("Failed to initialize real Live2D preview", error);
          setRuntimeStatus("error");
        }
      }
    };

    void setupLive2D();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      modelRef.current?.destroy?.({ children: true, texture: true, baseTexture: true });
      appRef.current?.destroy(false, { children: true, texture: true, baseTexture: true });
      modelRef.current = null;
      appRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const app = appRef.current;
    const model = modelRef.current;
    if (!enabled || !app || !model) return;

    applyParamsToLive2DModel(model, actingState.params, 1);
    model.update?.(1000 / FPS);
    app.renderer.render(app.stage);
  }, [actingState.params, enabled, frame]);

  return (
    <section className="nl2d-stage">
      <div className="nl2d-stage-grid" aria-hidden="true" />
      <div className={`nl2d-model-card ${expressionClass}`} ref={stageCardRef}>
        <span className="nl2d-model-aura" />
        <canvas className="nl2d-live-canvas" ref={canvasRef} />
        <span className={`nl2d-runtime-badge is-${runtimeStatus}`}>
          {runtimeStatus === "ready" ? "real Cubism model" : runtimeStatus === "error" ? "runtime fallback" : "loading moc3"}
        </span>
      </div>
      <div className="nl2d-stage-meta">
        <b>{data.characterName}</b>
        <span>{actingState.beat.label} · {emotion} · continuous sample → applyParamsToLive2DModel(realModel)</span>
      </div>
    </section>
  );
}

function PipelineStep({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <article className={`${active ? "is-active" : ""} ${done ? "is-done" : ""}`}>
      <b>{String(index).padStart(2, "0")}</b>
      <span>{label}</span>
    </article>
  );
}

function ParameterRow({
  id,
  value,
  min,
  max,
  progress,
  index,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  progress: number;
  index: number;
}) {
  const frame = useCurrentFrame();
  const enter = stepProgress(frame, 150 + index * 4, 178 + index * 4);
  const normalized = ((value - min) / (max - min)) * 100;

  return (
    <div className="nl2d-param-row" style={{ opacity: enter, transform: `translateX(${(1 - enter) * 18}px)` }}>
      <span>{id}</span>
      <i>
        <b style={{ width: `${normalized * progress}%` }} />
      </i>
      <em>{value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}</em>
    </div>
  );
}

function TimelineRail({ beats, progress }: { beats: NatureDemoBeat[]; progress: number }) {
  const durationMs = Math.round((DURATION_IN_FRAMES / FPS) * 1000);

  return (
    <section className="nl2d-timeline">
      <header>
        <span>sampleContinuousTimeline(dialogue, elapsed)</span>
        <b>{durationMs}ms</b>
      </header>
      <div className="nl2d-timeline-rail">
        <i style={{ width: `${progress * 100}%` }} />
        {beats.map((beat, index) => {
          const point = beats.length <= 1 ? 0 : index / (beats.length - 1);
          return (
          <b
            className={progress >= point ? "is-hit" : ""}
            style={{ left: `${point * 100}%` }}
            key={beat.id}
          >
            {Math.round(point * durationMs)}
            <small>{beat.label}</small>
          </b>
          );
        })}
      </div>
    </section>
  );
}

function NatureLive2DComposition({ data = DEFAULT_DEMO_DATA, enableLive2D = false }: NatureLive2DCompositionProps) {
  const frame = useCurrentFrame();
  const actingState = continuousActingState(data, frame);
  const { beat: activeBeat, beats } = actingState;
  const typed = typeText(frame, 20, 138, data.inputText);
  const analyzerProgress = stepProgress(frame, 88, 126);
  const paramProgress = stepProgress(frame, 140, 190);
  const adapterProgress = stepProgress(frame, 236, 292);
  const activeStep = frame < 86 ? 0 : frame < 132 ? 1 : frame < 220 ? 2 : 3;
  const displayedParams = displayParamsForState(actingState);
  const intentFields = [
    ["emotion", activeBeat.intent.emotion],
    ["intensity", activeBeat.intent.intensity?.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")],
    ["gaze", activeBeat.intent.gaze],
    ["mouth", activeBeat.intent.mouth],
  ].filter(([, value]) => value);
  const warningsText = activeBeat.warnings.length ? `${activeBeat.warnings.length} warning` : "no warnings";
  const adapterParams = activeBeat.adapterParams.length
    ? activeBeat.adapterParams
    : displayedParams.slice(0, 4).map((param) => param.id);

  return (
    <AbsoluteFill className="nl2d-root">
      <div className="nl2d-window">
        <header className="nl2d-titlebar">
          <div className="nl2d-lights">
            <span />
            <span />
            <span />
          </div>
          <b>nature-live2d — expression pipeline</b>
          <span>{data.runtimeLabel}</span>
        </header>
        <main className="nl2d-layout">
          {enableLive2D ? <Live2DModelStage data={data} enabled={enableLive2D} /> : <Live2DPlaceholderStage data={data} />}
          <section className="nl2d-console">
            <div className="nl2d-kicker">LLM → intent → params → Live2D</div>
            <h3>自然语言控制 Live2D 表情</h3>
            <div className="nl2d-pipeline">
              {["input text", "analyze emotion", "map safe params", "apply timeline"].map((label, index) => (
                <PipelineStep
                  index={index + 1}
                  label={label}
                  active={activeStep === index}
                  done={activeStep > index}
                  key={label}
                />
              ))}
            </div>
            <div className="nl2d-emotion-flow">
              <i style={{ width: `${actingState.progress * 100}%` }} />
              {beats.map((beat, index) => (
                <span
                  className={beat.id === activeBeat.id ? "is-active" : index < actingState.index ? "is-done" : ""}
                  style={{ left: `${beats.length <= 1 ? 0 : (index / (beats.length - 1)) * 100}%` }}
                  key={beat.id}
                >
                  <b>{beat.label}</b>
                  <em>{beat.intent.emotion}</em>
                </span>
              ))}
            </div>
            <div className="nl2d-input-card">
              <small>one dialogue · continuous emotion sampling</small>
              <p>
                {typed}
                {typed.length < data.inputText.length ? <i /> : null}
              </p>
              <button className={frame > 78 ? "is-run" : ""}>Run</button>
            </div>
            <div className="nl2d-intent-card" style={{ opacity: 0.35 + analyzerProgress * 0.65 }}>
              <header>
                <b>EmotionIntent</b>
                <span>{data.analyzerLabel}</span>
              </header>
              <div>
                {intentFields.map(([label, value]) => (
                  <span key={label}>{label} <b>{value}</b></span>
                ))}
              </div>
            </div>
            <div className="nl2d-param-card">
              <header>
                <b>clampParams(sampled blended intent)</b>
                <span>{warningsText}</span>
              </header>
              {displayedParams.map(({ id, value, min, max }, index) => (
                <ParameterRow
                  id={id}
                  value={value}
                  min={min}
                  max={max}
                  progress={paramProgress}
                  index={index}
                  key={id}
                />
              ))}
            </div>
            <TimelineRail beats={beats} progress={actingState.progress} />
            <div className="nl2d-adapter-card" style={{ opacity: 0.38 + adapterProgress * 0.62 }}>
              <code>applyParamsToLive2DModel(cubismModel, blend(sampleTimeline(emotionCurve, elapsed)))</code>
              <div>
                {adapterParams.map((item, index) => (
                  <span className={adapterProgress > index * 0.22 ? "is-on" : ""} key={item}>{item}</span>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
      <NatureCursor />
    </AbsoluteFill>
  );
}

export function NatureLive2DReplay() {
  const playerRef = useRef<PlayerRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSession, setPlaySession] = useState(0);
  const [demoData, setDemoData] = useState<NatureDemoData>(DEFAULT_DEMO_DATA);
  const requestRef = useRef<Promise<void> | null>(null);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const loadDemoData = () => {
    if (requestRef.current) return requestRef.current;

    requestRef.current = fetch("/api/nature-live2d-demo", { method: "GET" })
      .then((response) => {
        if (!response.ok) throw new Error(`nature-live2d demo returned ${response.status}`);
        return response.json() as Promise<NatureDemoData>;
      })
      .then((payload) => {
        if (payload?.timeline?.keyframes?.length && payload.params?.length) {
          setDemoData(payload);
          setPlaySession((current) => current + 1);
        }
      })
      .catch(() => {
        setDemoData(DEFAULT_DEMO_DATA);
      });

    return requestRef.current;
  };

  useEffect(() => {
    let raf = 0;
    let startedAt = 0;

    const tick = (timestamp: number) => {
      if (!startedAt) startedAt = timestamp;
      const elapsedSeconds = (timestamp - startedAt) / 1000;
      const nextFrame = Math.floor(elapsedSeconds * FPS) % DURATION_IN_FRAMES;
      playerRef.current?.seekTo(nextFrame);
      raf = window.requestAnimationFrame(tick);
    };

    if (isPlaying) {
      playerRef.current?.seekTo(0);
      raf = window.requestAnimationFrame(tick);
    } else {
      playerRef.current?.seekTo(0);
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isPlaying, playSession]);

  const startReplay = () => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    void loadDemoData();
    setPlaySession((current) => current + 1);
    setIsPlaying(true);
  };

  const stopReplay = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
  };

  return (
    <div
      className={`nature-live2d-remotion-shell ${isPlaying ? "is-playing" : "is-idle"}`}
      aria-hidden="true"
      onMouseEnter={startReplay}
      onMouseMove={startReplay}
      onMouseLeave={stopReplay}
      onPointerEnter={startReplay}
      onPointerMove={startReplay}
      onPointerLeave={stopReplay}
      onTouchStart={startReplay}
      onFocus={startReplay}
      onBlur={stopReplay}
    >
      <Player
        ref={playerRef}
        className="nature-live2d-remotion-player"
        component={NatureLive2DComposition}
        inputProps={{ data: demoData, enableLive2D: true }}
        compositionWidth={COMPOSITION_WIDTH}
        compositionHeight={COMPOSITION_HEIGHT}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        loop
        controls={false}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
