import { assistantSkill, iropProfile, knowledgeEntries } from "../src/data/iropKnowledge.js";
import { answerVisitorQuestion } from "../src/lib/iropAssistant.js";

const DEFAULT_TIMEOUT_MS = 12000;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON request body"));
      }
    });

    req.on("error", reject);
  });
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

function buildServerContext(question, localAnswer) {
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

function extractChatText(payload) {
  return payload?.choices?.[0]?.message?.content
    || payload?.choices?.[0]?.text
    || payload?.output_text
    || "";
}

function buildModelMessages(context) {
  const publicMemory = context.matchedEntries.length
    ? context.matchedEntries
    : knowledgeEntries.map(compactEntry);

  return [
    {
      role: "system",
      content: [
        "You are Iroha, the tiny assistant on irop.one.",
        context.skill.style,
        context.skill.boundaries,
        context.skill.dataPolicy,
        "Answer only from the supplied public memory. If unsure, say what is known and route to me@irop.one.",
        "Keep answers concise enough for a small website assistant panel.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        question: context.question,
        profile: context.profile,
        localAnswer: context.localAnswer,
        publicMemory,
      }),
    },
  ];
}

async function askConfiguredModel(context) {
  const endpoint = process.env.AI_CHAT_COMPLETIONS_ENDPOINT;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!endpoint || !apiKey || !model) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: buildModelMessages(context),
        temperature: 0.4,
        max_tokens: 220,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI endpoint returned ${response.status}`);
    }

    const payload = await response.json();
    const text = extractChatText(payload).trim();
    if (!text) return null;

    return {
      ...context.localAnswer,
      text,
      source: "irop server assistant",
      confidence: "remote",
      details: ["Generated server-side from the public irop.one knowledge base."],
      links: context.localAnswer.links,
      matchedEntries: context.localAnswer.matchedEntries,
      runtime: "server-ai",
      runtimeLabel: "REMOTE AI",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Use POST /api/iroha-assistant" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const question = String(body.question || "").trim();

    if (!question) {
      sendJson(res, 400, { error: "Question is required." });
      return;
    }

    const localAnswer = answerVisitorQuestion(question);
    const context = buildServerContext(question, localAnswer);
    const modelAnswer = await askConfiguredModel(context);

    sendJson(res, 200, modelAnswer || {
      ...localAnswer,
      runtime: "server-local",
      runtimeLabel: "SERVER KB",
      details: [
        "Server-side model endpoint is not configured; answering from the public irop.one knowledge base.",
        ...(localAnswer.details || []),
      ],
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Assistant server error",
      runtime: "server-error",
      runtimeLabel: "SERVER ERROR",
    });
  }
}
