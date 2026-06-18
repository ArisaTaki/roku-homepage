import {
  assistantSkill,
  iropProfile,
  knowledgeCollections,
  knowledgeEntries,
} from "../data/iropKnowledge.js";

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

function entriesForCollection(label) {
  const collection = knowledgeCollections.find((item) => item.label === label);
  if (!collection) return [];
  return collection.entryIds
    .map((entryId) => knowledgeEntries.find((entry) => entry.id === entryId))
    .filter(Boolean);
}

function linkedEntries(entries) {
  return entries.map((entry) => ({ label: entry.title, href: entry.href }));
}

function buildMatchedEntries(entries, score = 99) {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    type: entry.type,
    score,
  }));
}

function answerIntent(question, normalizedQuestion) {
  if (/(what can|what do you know|help|capabilit|你会|能问|可以问|知道什么|帮助|怎么用)/i.test(question)) {
    const projectEntries = entriesForCollection("Projects");
    const placeEntries = entriesForCollection("Places");

    return {
      text:
        "You can ask me about irop's profile, public projects, writing, gallery, shader demos, contact route, and how this Iroha skill works.",
      source: "irop portal skill",
      confidence: "guide",
      details: assistantSkill.capabilities,
      links: [
        { label: "Skill spec", href: assistantSkill.specHref },
        { label: "Manifest", href: assistantSkill.manifestHref },
        { label: "Email", href: `mailto:${iropProfile.contact}` },
      ],
      matchedEntries: buildMatchedEntries([...projectEntries, ...placeEntries], 20),
    };
  }

  if (/(projects?|works?|repo|github|项目|作品|仓库|代码)/i.test(question)) {
    const projectEntries = entriesForCollection("Projects");

    return {
      text:
        "The main public projects are Hermes-Yachiyo, nature-live2d, and mimo-usage-watcher. Hermes-Yachiyo is the local desktop agent app; nature-live2d maps natural language to Live2D expression control; mimo-usage-watcher monitors MiMo quota usage.",
      source: "Projects",
      confidence: "guide",
      details: projectEntries.map((entry) => entry.answer),
      links: linkedEntries(projectEntries),
      matchedEntries: buildMatchedEntries(projectEntries, 30),
    };
  }

  if (/(all links|links|sites?|where|导航|链接|入口|站点|网址|全部)/i.test(normalizedQuestion)) {
    return {
      text:
        "Useful irop links: GitHub for code, blog.irop.one for notes, images.irop.one for gallery work, shader.irop.one for WebGL demos, and me@irop.one for contact.",
      source: "irop links",
      confidence: "guide",
      details: ["Public links only; private details are not inferred."],
      links: iropProfile.links,
      matchedEntries: buildMatchedEntries(knowledgeEntries, 10),
    };
  }

  return null;
}

function composeAnswer(matches, question) {
  if (!matches.length) {
    return {
      text: `${iropProfile.summary} Try asking about ${fallbackKeywords.join(", ")} or contact.`,
      source: "irop profile",
      confidence: "fallback",
      links: iropProfile.links.slice(0, 3),
      details: [assistantSkill.dataPolicy],
      matchedEntries: [],
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
    details: primary.entry.details?.slice(0, 2) || [],
    links: [
      { label: primary.entry.title, href: primary.entry.href },
      ...(relatedEntry?.href ? [{ label: relatedEntry.title, href: relatedEntry.href }] : []),
    ].filter((link, index, list) => link.href && list.findIndex((item) => item.href === link.href) === index),
    matchedEntries: matches.map((match) => ({
      id: match.entry.id,
      title: match.entry.title,
      type: match.entry.type,
      score: match.score,
    })),
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
      details: assistantSkill.capabilities.slice(0, 2),
      matchedEntries: [],
    };
  }

  const intentAnswer = answerIntent(question, normalizedQuestion);
  if (intentAnswer) return intentAnswer;

  const tokens = tokenize(question);
  const matches = knowledgeEntries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, normalizedQuestion) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return composeAnswer(matches, question);
}
