import {
  assistantSkill,
  iropProfile,
  knowledgeEntries,
  type KnowledgeEntry,
} from "../data/iropKnowledge";
import { answerVisitorQuestion, isLocalOnlyAnswer, type AssistantAnswer } from "./iropAssistant";

const DEFAULT_TIMEOUT_MS = 15000;
const STREAM_STEP_MS = 16;

export type AssistantAnswerWithRuntime = AssistantAnswer & {
  runtime?: string;
  runtimeError?: string;
  runtimeLabel?: string;
};

export type AskIrohaOptions = {
  endpoint?: string;
  timeoutMs?: number;
};

export type AskIrohaStreamOptions = AskIrohaOptions & {
  onToken?: (text: string) => void;
};

type RemoteAnswer = Partial<AssistantAnswerWithRuntime> & {
  answer?: string;
};

type AssistantRequest = {
  question: string;
  skill: {
    name: string;
    version: string;
    style: string;
    boundaries: string;
    dataPolicy: string;
  };
  profile: {
    name: string;
    contact: string;
    summary: string;
    links: typeof iropProfile.links;
  };
  localAnswer: AssistantAnswer;
  matchedEntries: Array<Pick<KnowledgeEntry, "id" | "title" | "type" | "href" | "answer"> & { details: string[] }>;
};

function getConfiguredEndpoint(): string {
  return typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_IROP_ASSISTANT_ENDPOINT || ""
    : "";
}

function compactEntry(entry: KnowledgeEntry) {
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    href: entry.href,
    answer: entry.answer,
    details: entry.details || [],
  };
}

function stripJsonEnvelope(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function unwrapAssistantText(value: string, depth = 0): string {
  if (depth > 2) return value;

  const normalized = stripJsonEnvelope(value);
  if (!normalized) return value;

  try {
    const parsed = JSON.parse(normalized);
    if (typeof parsed === "string") return unwrapAssistantText(parsed, depth + 1);
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

export function buildAssistantRequest(question: string, localAnswer: AssistantAnswer): AssistantRequest {
  const matchedIds = new Set((localAnswer.matchedEntries || []).map((entry) => entry.id));
  const matchedEntries = knowledgeEntries
    .filter((entry) => matchedIds.has(entry.id))
    .map(compactEntry);

  return {
    question,
    skill: {
      name: assistantSkill.name,
      version: assistantSkill.version,
      style: assistantSkill.style,
      boundaries: assistantSkill.boundaries,
      dataPolicy: assistantSkill.dataPolicy,
    },
    profile: {
      name: iropProfile.name,
      contact: iropProfile.contact,
      summary: iropProfile.summary,
      links: iropProfile.links,
    },
    localAnswer,
    matchedEntries,
  };
}

function normalizeRemoteAnswer(
  remoteAnswer: RemoteAnswer | string | null,
  localAnswer: AssistantAnswer
): AssistantAnswerWithRuntime {
  const safeRemote: RemoteAnswer = remoteAnswer && typeof remoteAnswer === "object"
    ? remoteAnswer
    : { text: String(remoteAnswer || "") };
  const text = unwrapAssistantText(safeRemote.text || safeRemote.answer || localAnswer.text);
  const source = safeRemote.source || "remote irop assistant";

  return {
    ...localAnswer,
    ...safeRemote,
    text,
    source,
    confidence: safeRemote.confidence || localAnswer.confidence || "remote",
    details: Array.isArray(safeRemote.details) ? safeRemote.details : localAnswer.details,
    links: Array.isArray(safeRemote.links) ? safeRemote.links : localAnswer.links,
    runtime: safeRemote.runtime || "remote",
    runtimeLabel: safeRemote.runtimeLabel || "REMOTE AI",
  };
}

function withLocalRuntime(
  localAnswer: AssistantAnswer,
  runtimeLabel = "LOCAL KB",
  runtimeError = ""
): AssistantAnswerWithRuntime {
  return {
    ...localAnswer,
    mood: runtimeError ? "error" : localAnswer.mood,
    runtime: runtimeError ? "local-fallback" : "local",
    runtimeError,
    runtimeLabel,
  };
}

function streamDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function emitAssistantText(text: string, onToken?: (text: string) => void): Promise<void> {
  if (!onToken) return;

  let rendered = "";
  const characters = Array.from(text);

  for (const character of characters) {
    rendered += character;
    onToken(rendered);

    const delay = /[。！？.!?]/.test(character)
      ? STREAM_STEP_MS * 4
      : /[，、,;；:：]/.test(character)
        ? STREAM_STEP_MS * 2
        : STREAM_STEP_MS;

    await streamDelay(delay);
  }
}

export async function askIroha(
  rawQuestion: string,
  options: AskIrohaOptions = {}
): Promise<AssistantAnswerWithRuntime> {
  const question = rawQuestion.trim();
  const localAnswer = answerVisitorQuestion(question);
  const endpoint = options.endpoint ?? getConfiguredEndpoint();

  if (!endpoint) {
    return withLocalRuntime(localAnswer);
  }

  if (isLocalOnlyAnswer(localAnswer)) {
    return withLocalRuntime(localAnswer);
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    options.timeoutMs || DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildAssistantRequest(question, localAnswer)),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Remote assistant returned ${response.status}`);
    }

    const remoteAnswer = (await response.json()) as RemoteAnswer;
    return normalizeRemoteAnswer(remoteAnswer, localAnswer);
  } catch (error) {
    return withLocalRuntime(
      {
        ...localAnswer,
        details: [
          "Remote assistant unavailable; answering from the local public knowledge base.",
          ...(localAnswer.details || []),
        ],
      },
      "LOCAL FALLBACK",
      error instanceof Error ? error.message : "Remote assistant unavailable"
    );
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export async function askIrohaStream(
  rawQuestion: string,
  options: AskIrohaStreamOptions = {}
): Promise<AssistantAnswerWithRuntime> {
  const answer = await askIroha(rawQuestion, options);
  await emitAssistantText(answer.text, options.onToken);
  return answer;
}
