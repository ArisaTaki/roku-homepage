import { iropProfile, knowledgeEntries } from "../data/iropKnowledge.js";

const fallbackKeywords = ["project", "ai", "tool", "live2d", "webgl", "blog", "gallery", "contact"];

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokenize(value) {
  const normalized = normalize(value);
  if (!normalized) return [];
  const words = normalized.split(/\s+/).filter(Boolean);
  const cjk = Array.from(value.matchAll(/[\p{Script=Han}]{1,4}/gu), (match) => match[0]);
  return [...new Set([...words, ...cjk])];
}

function entryHaystack(entry) {
  return [
    entry.title,
    entry.type,
    entry.answer,
    ...(entry.details || []),
    ...(entry.keywords || []),
  ].join(" ");
}

function scoreEntry(entry, tokens, normalizedQuestion) {
  const haystack = normalize(entryHaystack(entry));
  let score = 0;

  for (const token of tokens) {
    if (token.length <= 1) continue;
    if (entry.keywords?.some((keyword) => normalize(keyword) === token)) score += 6;
    else if (entry.keywords?.some((keyword) => normalize(keyword).includes(token))) score += 4;
    if (haystack.includes(token)) score += token.length > 4 ? 3 : 1;
  }

  if (normalizedQuestion.includes(normalize(entry.title))) score += 8;
  if (entry.id === "profile" && /(who|about|介绍|是谁|profile)/i.test(normalizedQuestion)) score += 6;
  if (entry.id === "contact" && /(contact|email|mail|联系|邮箱)/i.test(normalizedQuestion)) score += 8;

  return score;
}

function composeAnswer(matches, question) {
  if (!matches.length) {
    return {
      text: `${iropProfile.summary} Try asking about ${fallbackKeywords.join(", ")} or contact.`,
      source: "irop profile",
      confidence: "fallback",
      links: iropProfile.links.slice(0, 3),
    };
  }

  const [primary, secondary] = matches;
  const relatedEntry = secondary
    && !["profile", "contact"].includes(secondary.entry.id)
    && secondary.score >= Math.max(5, primary.score * 0.45)
    ? secondary.entry
    : null;
  const related = relatedEntry ? ` Related: ${relatedEntry.title}.` : "";

  return {
    text: `${primary.entry.answer}${related}`,
    source: primary.entry.title,
    confidence: primary.score > 12 ? "high" : "medium",
    links: [
      { label: primary.entry.title, href: primary.entry.href },
      ...(relatedEntry?.href ? [{ label: relatedEntry.title, href: relatedEntry.href }] : []),
    ].filter((link, index, list) => link.href && list.findIndex((item) => item.href === link.href) === index),
    debug: { question },
  };
}

export function answerVisitorQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  const normalizedQuestion = normalize(question);

  if (!question) {
    return {
      text: "Ask me about projects, AI tools, Live2D, WebGL, writing, galleries, or how to contact irop.",
      source: "irop portal skill",
      confidence: "prompt",
      links: iropProfile.links.slice(0, 3),
    };
  }

  const tokens = tokenize(question);
  const matches = knowledgeEntries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, normalizedQuestion) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return composeAnswer(matches, question);
}
