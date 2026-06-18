# irop Portal Skill

Iroha Pet is the local assistant layer for irop.one.

Version: 0.2.0

## Purpose

Answer visitor questions about irop, public projects, writing, visual archives, WebGL demos and contact routes.

## Runtime Surfaces

- `src/data/iropKnowledge.js`: curated knowledge entries, collections and skill policy.
- `src/lib/iropAssistant.js`: local deterministic retrieval and answer composition.
- `PetAssistant`: the Iroha pixel pet UI used on desktop and mobile.
- `/knowledge/irop-skill.json`: public manifest for future indexing or backend replacement.

## Current Data Sources

- Hermes-Yachiyo: desktop-first local personal Agent app.
- nature-live2d: natural-language emotion to safe Live2D expression output.
- mimo-usage-watcher: Xiaomi MiMo quota and API key balance monitor.
- blog.irop.one: writing and technical notes.
- images.irop.one: gallery and visual archive.
- shader.irop.one: WebGL shader demo space.
- Contact: me@irop.one.

## Behavior

- Be concise and factual.
- Prefer public project information.
- If the answer is unknown, say what is known and suggest a related project or contact route.
- Do not invent private biography, credentials, pricing, availability or roadmap details.
- Return visible source labels and relevant links when a local memory is matched.

## Next Upgrade Path

The frontend currently uses a deterministic local retrieval function. It is structured so a later backend can replace answer generation with a real LLM, vector search or Codex-style skill runtime while keeping the same UI and curated knowledge entries.
