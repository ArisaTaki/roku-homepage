import { assistantSkill, iropProfile, knowledgeEntries } from "../data/iropKnowledge.js";
import { answerVisitorQuestion } from "./iropAssistant.js";

const DEFAULT_TIMEOUT_MS = 4500;

function getConfiguredEndpoint() {
  return typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_IROP_ASSISTANT_ENDPOINT
    : "";
}

function compactEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    type: entry.type,
    href: entry.href,
    answer: entry.answer,
    details: entry.details || [],
  };
}

export function buildAssistantRequest(question, localAnswer) {
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

function normalizeRemoteAnswer(remoteAnswer, localAnswer) {
  const safeRemote = remoteAnswer && typeof remoteAnswer === "object"
    ? remoteAnswer
    : { text: String(remoteAnswer || "") };
  const text = safeRemote.text || safeRemote.answer || localAnswer.text;
  const source = safeRemote.source || "remote irop assistant";

  return {
    ...localAnswer,
    ...safeRemote,
    text,
    source,
    confidence: safeRemote.confidence || localAnswer.confidence || "remote",
    details: Array.isArray(safeRemote.details) ? safeRemote.details : localAnswer.details,
    links: Array.isArray(safeRemote.links) ? safeRemote.links : localAnswer.links,
    runtime: "remote",
    runtimeLabel: "REMOTE AI",
  };
}

function withLocalRuntime(localAnswer, runtimeLabel = "LOCAL KB", runtimeError = "") {
  return {
    ...localAnswer,
    runtime: runtimeError ? "local-fallback" : "local",
    runtimeError,
    runtimeLabel,
  };
}

export async function askIroha(rawQuestion, options = {}) {
  const question = rawQuestion.trim();
  const localAnswer = answerVisitorQuestion(question);
  const endpoint = options.endpoint ?? getConfiguredEndpoint();

  if (!endpoint) {
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

    const remoteAnswer = await response.json();
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
