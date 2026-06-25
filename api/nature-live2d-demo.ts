import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
const NATURE_LIVE2D_PACKAGE_NAME = "@kuguya-ai/nature-live2d";
const DEFAULT_PROJECT_DIR = "/Users/hacchiroku/AI/nature-live2d";
const DEFAULT_TEXT = "咦？这个表情真的会跟着一句话变化吗……刚刚有点被吓到。可是没关系，我会认真听你说，也会陪你把这段流程跑完。嗯，现在放心啦，我们一起笑一下吧。";
const DEFAULT_MODEL_THINKING = "disabled";

const defaultEmotionCurve = [
  {
    id: "surprised",
    label: "惊讶",
    text: "咦？这个表情真的会跟着一句话变化吗……刚刚有点被吓到。",
    intent: {
      emotion: "surprised",
      intensity: 0.92,
      gaze: "front",
      head: "lift",
      eyes: "wide",
      brows: "raised",
      mouth: "open",
      specialExpression: "none",
      durationMs: 1200,
    },
  },
  {
    id: "sad",
    label: "悲伤",
    text: "我刚刚没有立刻反应过来，心里有一点点低落。",
    intent: {
      emotion: "sad",
      intensity: 0.78,
      gaze: "down",
      head: "down_left",
      eyes: "soft",
      brows: "worried",
      mouth: "small_frown",
      specialExpression: "tears",
      durationMs: 1300,
    },
  },
  {
    id: "caring",
    label: "关心",
    text: "可是没关系，我会认真听你说，也会陪你把这段流程跑完。",
    intent: {
      emotion: "shy",
      intensity: 0.64,
      gaze: "front",
      head: "gentle_tilt",
      eyes: "soft",
      brows: "relaxed",
      mouth: "small_smile",
      specialExpression: "none",
      durationMs: 1400,
    },
  },
  {
    id: "happy",
    label: "开心",
    text: "嗯，现在放心啦，我们一起笑一下吧。",
    intent: {
      emotion: "happy",
      intensity: 0.95,
      gaze: "front",
      head: "up",
      eyes: "closed_smile",
      brows: "relaxed",
      mouth: "big_smile",
      specialExpression: "closed_eye_smile",
      durationMs: 1200,
    },
  },
] as const;

const allowedEmotions = [
  "neutral",
  "happy",
  "shy",
  "embarrassed",
  "angry",
  "sad",
  "crying",
  "surprised",
  "confused",
  "teasing",
  "sleepy",
  "panic",
] as const;

const allowedSpecialExpressions = [
  "none",
  "tears",
  "tear_drop",
  "closed_eye_smile",
  "squeezed_eyes",
] as const;

const preferredParamIds = [
  "ParamAngleY",
  "ParamAngleZ",
  "ParamEyeLOpen",
  "ParamEyeROpen",
  "ParamEyeBallX",
  "ParamEyeBallY",
  "ParamBrowLY",
  "ParamBrowRY",
  "ParamMouthForm",
  "ParamMouthOpenY",
  "ParamCheek",
];

type EmotionName = (typeof allowedEmotions)[number];
type SpecialExpressionName = (typeof allowedSpecialExpressions)[number];

type EmotionIntent = {
  emotion: EmotionName;
  intensity?: number;
  gaze?: string | null;
  head?: string | null;
  eyes?: string | null;
  brows?: string | null;
  mouth?: string | null;
  specialExpression?: SpecialExpressionName | null;
  durationMs?: number;
};

type DemoCurveSample = {
  id: string;
  label: string;
  text: string;
  intent: EmotionIntent;
};

type TimelineExpressionResult = {
  emotion: EmotionName;
  intensity: number;
  durationMs: number;
  keyframes: Array<{
    t: number;
    params: Record<string, number>;
  }>;
  warnings: string[];
};

type ParameterProfile = {
  range?: {
    min: number;
    max: number;
    default?: number | null;
  } | null;
  meta?: {
    name?: string | null;
  } | null;
};

type NatureLive2DModule = {
  Live2DExpressionEngine: {
    fromNodeDirectory: (
      rootDir: string,
      options?: { analyzer?: { analyze(text: string): EmotionIntent | Promise<EmotionIntent> } }
    ) => Promise<{
      profile: {
        characterName: string;
        parameters: Record<string, ParameterProfile>;
        mainControls: string[];
      };
      generateTimelineFromIntent(intent: EmotionIntent): TimelineExpressionResult;
    }>;
  };
  MockEmotionAnalyzer: new () => {
    analyze(text: string): EmotionIntent;
  };
  sampleTimeline: (timeline: TimelineExpressionResult, elapsedMs: number) => Record<string, number>;
};

type ChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
    text?: string;
  }>;
  output_text?: string;
};

type DemoParameter = {
  id: string;
  value: number;
  min: number;
  max: number;
};

type NatureLive2DDemoBeat = {
  id: string;
  label: string;
  inputText: string;
  intent: EmotionIntent;
  timeline: TimelineExpressionResult;
  sampleAtMs: number;
  sampleParams: Record<string, number>;
  params: DemoParameter[];
  adapterParams: string[];
  warnings: string[];
};

export type NatureLive2DDemoPayload = {
  inputText: string;
  runtime: "nature-live2d-deepseek" | "nature-live2d-mock" | "nature-live2d-fallback";
  runtimeLabel: string;
  analyzerLabel: string;
  characterName: string;
  intent: EmotionIntent;
  timeline: TimelineExpressionResult;
  sampleAtMs: number;
  sampleParams: Record<string, number>;
  params: DemoParameter[];
  adapterParams: string[];
  beats: NatureLive2DDemoBeat[];
  warnings: string[];
  note: string;
};

const demoCache = new Map<string, Promise<NatureLive2DDemoPayload>>();

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: IncomingMessage): Promise<{ text?: unknown }> {
  return new Promise((resolveBody, reject) => {
    let body = "";

    req.on("data", (chunk: Buffer | string) => {
      body += chunk;
      if (body.length > 16_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolveBody({});
        return;
      }

      try {
        resolveBody(JSON.parse(body) as { text?: unknown });
      } catch {
        reject(new Error("Invalid JSON request body"));
      }
    });

    req.on("error", reject);
  });
}

function firstQueryValue(req: IncomingMessage, key: string): string {
  const url = new URL(req.url || "/", "http://localhost");
  return url.searchParams.get(key)?.trim() || "";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stripJsonEnvelope(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractChatText(payload: ChatCompletionPayload): string {
  return payload?.choices?.[0]?.message?.content
    || payload?.choices?.[0]?.text
    || payload?.output_text
    || "";
}

function parseJsonFromText(value: string): unknown | null {
  const jsonText = stripJsonEnvelope(value);
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch {
    const objectStart = jsonText.indexOf("{");
    const objectEnd = jsonText.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return JSON.parse(jsonText.slice(objectStart, objectEnd + 1));
      } catch {
        // Fall through to array extraction below.
      }
    }

    const arrayStart = jsonText.indexOf("[");
    const arrayEnd = jsonText.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(jsonText.slice(arrayStart, arrayEnd + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
}

function normalizeIntent(value: unknown): EmotionIntent | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const rawEmotion = String(record.emotion || "").trim();
  const emotion = allowedEmotions.includes(rawEmotion as EmotionName)
    ? rawEmotion as EmotionName
    : null;
  if (!emotion) return null;

  const rawSpecial = record.specialExpression == null ? null : String(record.specialExpression).trim();
  const specialExpression = rawSpecial && allowedSpecialExpressions.includes(rawSpecial as SpecialExpressionName)
    ? rawSpecial as SpecialExpressionName
    : rawSpecial ? "none" : null;
  const intensity = Number(record.intensity);
  const durationMs = Number(record.durationMs);

  return {
    emotion,
    intensity: Number.isFinite(intensity) ? clamp(intensity, 0, 1) : undefined,
    gaze: typeof record.gaze === "string" ? record.gaze : null,
    head: typeof record.head === "string" ? record.head : null,
    eyes: typeof record.eyes === "string" ? record.eyes : null,
    brows: typeof record.brows === "string" ? record.brows : null,
    mouth: typeof record.mouth === "string" ? record.mouth : null,
    specialExpression,
    durationMs: Number.isFinite(durationMs) ? clamp(durationMs, 400, 2400) : undefined,
  };
}

function parseIntentFromText(value: string): EmotionIntent | null {
  return normalizeIntent(parseJsonFromText(value));
}

function labelForSample(id: string, emotion: string): string {
  const labels: Record<string, string> = {
    surprised: "惊讶",
    sad: "悲伤",
    caring: "关心",
    happy: "开心",
    shy: "害羞",
    neutral: "平静",
    angry: "生气",
    confused: "困惑",
    teasing: "调皮",
    sleepy: "困倦",
    panic: "慌张",
  };

  return labels[id] || labels[emotion] || id || emotion || "情绪";
}

function normalizeCurveSample(value: unknown, index: number): DemoCurveSample | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const fallback = defaultEmotionCurve[Math.min(index, defaultEmotionCurve.length - 1)];
  const intent = normalizeIntent(record.intent ?? record);
  if (!intent) return null;

  const rawId = String(record.id || fallback.id || intent.emotion).trim();
  const id = rawId || fallback.id;
  const rawLabel = typeof record.label === "string" ? record.label.trim() : "";
  const rawText = typeof record.text === "string"
    ? record.text.trim()
    : typeof record.cue === "string"
      ? record.cue.trim()
      : "";

  return {
    id,
    label: rawLabel || labelForSample(id, intent.emotion),
    text: rawText || fallback.text,
    intent,
  };
}

function normalizeCurve(value: unknown): DemoCurveSample[] | null {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : null;
  const rawSamples = Array.isArray(value)
    ? value
    : Array.isArray(record?.samples)
      ? record.samples
      : Array.isArray(record?.curve)
        ? record.curve
        : Array.isArray(record?.timeline)
          ? record.timeline
          : null;

  if (!rawSamples) return null;

  const samples = rawSamples
    .map((sample, index) => normalizeCurveSample(sample, index))
    .filter((sample): sample is DemoCurveSample => Boolean(sample))
    .slice(0, 6);

  return samples.length >= 2 ? samples : null;
}

function parseCurveFromText(value: string): DemoCurveSample[] | null {
  return normalizeCurve(parseJsonFromText(value));
}

function buildDeepSeekMessages(text: string) {
  return [
    {
      role: "system",
      content: [
        "You convert natural-language Live2D acting direction into one safe EmotionIntent JSON object.",
        `Allowed emotion values: ${allowedEmotions.join(", ")}.`,
        "Allowed specialExpression values: none, tears, tear_drop, closed_eye_smile, squeezed_eyes.",
        "Use short lowercase strings for gaze/head/eyes/brows/mouth when useful, otherwise null.",
        "Choose a durationMs between 800 and 1600 for normal expressions.",
        "Return JSON only. Shape: {\"emotion\":\"shy\",\"intensity\":0.7,\"gaze\":\"down_right\",\"head\":null,\"eyes\":null,\"brows\":null,\"mouth\":\"small_smile\",\"specialExpression\":\"none\",\"durationMs\":1200}.",
      ].join(" "),
    },
    {
      role: "user",
      content: text,
    },
  ];
}

function buildDeepSeekCurveMessages(text: string) {
  return [
    {
      role: "system",
      content: [
        "You convert one continuous Chinese Live2D dialogue into an emotion curve for a real Cubism model.",
        "Treat the user text as one uninterrupted acting line, not separate scenarios.",
        "Return JSON only, with this exact shape: {\"samples\":[{\"id\":\"surprised\",\"label\":\"惊讶\",\"text\":\"short quote from this dialogue\",\"emotion\":\"surprised\",\"intensity\":0.9,\"gaze\":\"front\",\"head\":\"lift\",\"eyes\":\"wide\",\"brows\":\"raised\",\"mouth\":\"open\",\"specialExpression\":\"none\",\"durationMs\":1200}]}",
        "Use 4 samples unless the text clearly needs 5. The intended demo arc should feel continuous and dramatic: surprised -> sad -> caring -> happy.",
        "The id may be surprised, sad, caring, happy, shy, confused, or neutral.",
        `Allowed emotion values: ${allowedEmotions.join(", ")}.`,
        "Allowed specialExpression values: none, tears, tear_drop, closed_eye_smile, squeezed_eyes.",
        "Use the same language as the input for labels. Keep each text field a short contiguous quote or paraphrase from the original dialogue.",
      ].join(" "),
    },
    {
      role: "user",
      content: text,
    },
  ];
}

class DeepSeekEmotionAnalyzer {
  constructor(
    private readonly endpoint: string,
    private readonly model: string,
    private readonly apiKey: string,
  ) {}

  async analyze(text: string): Promise<EmotionIntent> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.NATURE_LIVE2D_TIMEOUT_MS || process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    );

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: buildDeepSeekMessages(text),
          thinking: { type: process.env.AI_THINKING || DEFAULT_MODEL_THINKING },
          temperature: 0.2,
          max_tokens: 180,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`DeepSeek endpoint returned ${response.status}`);
      }

      const payload = (await response.json()) as ChatCompletionPayload;
      const intent = parseIntentFromText(extractChatText(payload));
      if (!intent) throw new Error("DeepSeek did not return a valid EmotionIntent JSON object");
      return intent;
    } finally {
      clearTimeout(timeout);
    }
  }

  async analyzeCurve(text: string): Promise<DemoCurveSample[]> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.NATURE_LIVE2D_TIMEOUT_MS || process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    );

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: buildDeepSeekCurveMessages(text),
          thinking: { type: process.env.AI_THINKING || DEFAULT_MODEL_THINKING },
          temperature: 0.18,
          max_tokens: 900,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`DeepSeek endpoint returned ${response.status}`);
      }

      const payload = (await response.json()) as ChatCompletionPayload;
      const curve = parseCurveFromText(extractChatText(payload));
      if (!curve) throw new Error("DeepSeek did not return a valid emotion curve JSON object");
      return curve;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function loadNatureLive2DModule(projectDir: string): Promise<NatureLive2DModule> {
  try {
    return await import(NATURE_LIVE2D_PACKAGE_NAME) as NatureLive2DModule;
  } catch (packageError) {
    const indexFile = resolve(projectDir, "dist/index.js");

    try {
      return await import(pathToFileURL(indexFile).href) as NatureLive2DModule;
    } catch (localError) {
      const packageMessage = packageError instanceof Error ? packageError.message : String(packageError);
      const localMessage = localError instanceof Error ? localError.message : String(localError);
      throw new Error(
        `Unable to load ${NATURE_LIVE2D_PACKAGE_NAME}. package import failed: ${packageMessage}; local development import failed: ${localMessage}`
      );
    }
  }
}

function parameterRange(
  profile: { parameters: Record<string, ParameterProfile> },
  id: string,
  value: number,
): { min: number; max: number } {
  const range = profile.parameters[id]?.range;
  if (range && Number.isFinite(range.min) && Number.isFinite(range.max) && range.min !== range.max) {
    return { min: range.min, max: range.max };
  }

  if (Math.abs(value) <= 1) return { min: -1, max: 1 };
  return { min: Math.min(-1, value * 1.5), max: Math.max(1, value * 1.5) };
}

function buildDemoParams(
  profile: { parameters: Record<string, ParameterProfile>; mainControls: string[] },
  sampleParams: Record<string, number>,
): DemoParameter[] {
  const ids = [
    ...preferredParamIds.filter((id) => id in sampleParams),
    ...Object.keys(sampleParams).filter((id) => !preferredParamIds.includes(id)).slice(0, 8),
  ].slice(0, 11);

  return ids.map((id) => {
    const value = sampleParams[id];
    const range = parameterRange(profile, id, value);
    return {
      id,
      value,
      min: range.min,
      max: range.max,
    };
  });
}

function adapterParamsFor(params: DemoParameter[]): string[] {
  const preferred = ["ParamAngleY", "ParamEyeBallX", "ParamMouthForm", "ParamCheek"];
  const matches = params
    .map((param) => param.id)
    .filter((id) => preferred.includes(id));

  return (matches.length ? matches : params.map((param) => param.id)).slice(0, 4);
}

function configuredDeepSeek() {
  const apiKey = process.env.NATURE_LIVE2D_API_KEY || process.env.LIVE2D_LLM_API_KEY || process.env.AI_API_KEY;
  const endpoint = process.env.NATURE_LIVE2D_ENDPOINT
    || process.env.LIVE2D_LLM_BASE_URL
    || process.env.AI_CHAT_COMPLETIONS_ENDPOINT
    || (apiKey ? DEFAULT_DEEPSEEK_ENDPOINT : "");
  const model = process.env.NATURE_LIVE2D_MODEL
    || process.env.LIVE2D_LLM_MODEL
    || process.env.AI_MODEL
    || (apiKey ? DEFAULT_DEEPSEEK_MODEL : "");

  return endpoint && apiKey && model
    ? { endpoint, apiKey, model }
    : null;
}

function makeBeat(
  engine: {
    profile: {
      characterName: string;
      parameters: Record<string, ParameterProfile>;
      mainControls: string[];
    };
    generateTimelineFromIntent(intent: EmotionIntent): TimelineExpressionResult;
  },
  natureLive2D: Pick<NatureLive2DModule, "sampleTimeline">,
  sample: DemoCurveSample,
): NatureLive2DDemoBeat {
  const timeline = engine.generateTimelineFromIntent(sample.intent);
  const sampleAtMs = Math.round(timeline.durationMs * 0.25);
  const sampleParams = natureLive2D.sampleTimeline(timeline, sampleAtMs);
  const params = buildDemoParams(engine.profile, sampleParams);

  return {
    id: sample.id,
    label: sample.label,
    inputText: sample.text,
    intent: sample.intent,
    timeline,
    sampleAtMs,
    sampleParams,
    params,
    adapterParams: adapterParamsFor(params),
    warnings: timeline.warnings,
  };
}

function defaultCurveSamples(): DemoCurveSample[] {
  return defaultEmotionCurve.map((sample) => ({
    id: sample.id,
    label: sample.label,
    text: sample.text,
    intent: sample.intent,
  }));
}

async function generateDemoPayload(text: string): Promise<NatureLive2DDemoPayload> {
  const projectDir = process.env.NATURE_LIVE2D_PROJECT_DIR || DEFAULT_PROJECT_DIR;
  const yachiyoDir = process.env.NATURE_LIVE2D_MODEL_DIR || resolve(projectDir, "yachiyo");
  const natureLive2D = await loadNatureLive2DModule(projectDir);
  const deepSeekConfig = configuredDeepSeek();
  const mockAnalyzer = new natureLive2D.MockEmotionAnalyzer();
  let analyzer: { analyze(text: string): EmotionIntent | Promise<EmotionIntent> } = mockAnalyzer;
  let analyzerLabel = "MockEmotionAnalyzer";
  let runtime: NatureLive2DDemoPayload["runtime"] = "nature-live2d-mock";
  let runtimeLabel = "NATURE ENGINE";
  const warnings: string[] = [];
  let curveSamples = defaultCurveSamples();

  if (deepSeekConfig) {
    const deepSeekAnalyzer = new DeepSeekEmotionAnalyzer(
      deepSeekConfig.endpoint,
      deepSeekConfig.model,
      deepSeekConfig.apiKey,
    );
    analyzer = deepSeekAnalyzer;
    analyzerLabel = `DeepSeek · ${deepSeekConfig.model}`;
    runtime = "nature-live2d-deepseek";
    runtimeLabel = "DEEPSEEK + NATURE";

    try {
      curveSamples = await deepSeekAnalyzer.analyzeCurve(text);
    } catch (error) {
      curveSamples = defaultCurveSamples();
      analyzer = mockAnalyzer;
      analyzerLabel = "MockEmotionAnalyzer fallback";
      runtime = "nature-live2d-fallback";
      runtimeLabel = "NATURE FALLBACK";
      warnings.push(error instanceof Error ? error.message : "DeepSeek curve analyzer failed");
    }
  }

  const engine = await natureLive2D.Live2DExpressionEngine.fromNodeDirectory(yachiyoDir, { analyzer });
  let beats = curveSamples.map((sample) => makeBeat(engine, natureLive2D, sample));

  if (!beats.length) {
    curveSamples = defaultCurveSamples();
    beats = curveSamples.map((sample) => makeBeat(engine, natureLive2D, sample));
    analyzerLabel = "MockEmotionAnalyzer fallback";
    runtime = "nature-live2d-fallback";
    runtimeLabel = "NATURE FALLBACK";
    warnings.push("Emotion curve was empty; using the built-in continuous acting curve.");
  }

  const leadBeat = beats[0];

  return {
    inputText: text,
    runtime,
    runtimeLabel,
    analyzerLabel,
    characterName: engine.profile.characterName,
    intent: leadBeat.intent,
    timeline: leadBeat.timeline,
    sampleAtMs: leadBeat.sampleAtMs,
    sampleParams: leadBeat.sampleParams,
    params: leadBeat.params,
    adapterParams: leadBeat.adapterParams,
    beats,
    warnings: [...warnings, ...beats.flatMap((beat) => beat.warnings)],
    note: runtime === "nature-live2d-deepseek"
      ? "DeepSeek analyzed one continuous dialogue into an emotion curve; nature-live2d generated safe timelines that the frontend blends continuously."
      : "nature-live2d generated one built-in continuous emotion curve; the frontend blends it continuously.",
  };
}

async function demoPayload(text: string): Promise<NatureLive2DDemoPayload> {
  const cacheKey = [
    text,
    configuredDeepSeek()?.model || "mock",
    process.env.NATURE_LIVE2D_PROJECT_DIR || DEFAULT_PROJECT_DIR,
  ].join("|");

  let cached = demoCache.get(cacheKey);
  if (!cached) {
    cached = generateDemoPayload(text);
    demoCache.set(cacheKey, cached);
  }

  return cached;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { error: "Use GET or POST /api/nature-live2d-demo" });
    return;
  }

  try {
    const body = req.method === "POST" ? await readJsonBody(req) : {};
    const text = String(body.text || firstQueryValue(req, "text") || DEFAULT_TEXT).trim().slice(0, 240);
    sendJson(res, 200, await demoPayload(text || DEFAULT_TEXT));
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "nature-live2d demo server error",
      runtime: "nature-live2d-error",
      runtimeLabel: "NATURE ERROR",
    });
  }
}
