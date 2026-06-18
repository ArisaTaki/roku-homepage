import { readFile } from "node:fs/promises";
import { assistantSkill, iropProfile, knowledgeEntries } from "../src/data/iropKnowledge.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const manifest = JSON.parse(
  await readFile(new URL("../public/knowledge/irop-skill.json", import.meta.url), "utf8")
);

assert(manifest.name === assistantSkill.name, "manifest name should match assistantSkill.name");
assert(manifest.version === assistantSkill.version, "manifest version should match assistantSkill.version");
assert(manifest.contact === iropProfile.contact, "manifest contact should match iropProfile.contact");
assert(manifest.apiContract === assistantSkill.apiHref, "manifest apiContract should match assistantSkill.apiHref");
assert(manifest.optionalFrontendEnv === "VITE_IROP_ASSISTANT_ENDPOINT", "manifest should document frontend endpoint env");
assert(Array.isArray(manifest.entries), "manifest entries should be an array");
assert(manifest.entries.length === knowledgeEntries.length, "manifest entry count should match knowledgeEntries");

for (const entry of knowledgeEntries) {
  const manifestEntry = manifest.entries.find((item) => item.id === entry.id);
  assert(manifestEntry, `manifest is missing entry ${entry.id}`);
  assert(manifestEntry.title === entry.title, `manifest title mismatch for ${entry.id}`);
  assert(manifestEntry.type === entry.type, `manifest type mismatch for ${entry.id}`);
  assert(manifestEntry.href === entry.href, `manifest href mismatch for ${entry.id}`);
}

console.log("Iroha manifest check passed.");
