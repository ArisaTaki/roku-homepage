# irop Portal Skill

Iroha Pet is the local assistant layer for irop.one.

Version: 0.3.0

## Purpose

Answer visitor questions about irop, public projects, writing, visual archives, WebGL demos and contact routes.

## Runtime Surfaces

- `src/data/iropKnowledge.js`: curated knowledge entries, collections and skill policy.
- `src/lib/iropAssistant.js`: local deterministic retrieval and answer composition.
- `src/lib/iropAssistantClient.js`: optional remote assistant adapter with local fallback.
- `api/iroha-assistant.js`: serverless assistant endpoint with model-ready server-side fallback.
- `PetAssistant`: the Iroha pixel pet UI used on desktop and mobile.
- `/knowledge/irop-skill.json`: public manifest for future indexing or backend replacement.
- `/knowledge/irop-assistant-api.md`: POST contract for a future server-side LLM/RAG endpoint.

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
- If `VITE_IROP_ASSISTANT_ENDPOINT` is configured, ask that server first and fall back locally on timeout or error.

## Next Upgrade Path

The frontend currently uses deterministic local retrieval by default. It can call a server-side endpoint that owns model credentials, vector search, or a Codex-style skill runtime while keeping the same Iroha UI and curated knowledge entries.
