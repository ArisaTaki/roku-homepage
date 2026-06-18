# Iroha Assistant API Contract

The frontend works without a server. When `VITE_IROP_ASSISTANT_ENDPOINT` is configured, it can ask a server-side assistant first and fall back to local retrieval if the server is unavailable.

Do not put model API keys in the browser. The endpoint should be a server you control.

This repo includes a Vercel-style serverless entry at `api/iroha-assistant.js`. Without model settings it still answers from the same public knowledge base on the server. With server-only model settings it calls an OpenAI-compatible chat-completions endpoint.

## Environment

```bash
VITE_IROP_ASSISTANT_ENDPOINT=/api/iroha-assistant
AI_CHAT_COMPLETIONS_ENDPOINT=https://your-server-or-provider/v1/chat/completions
AI_MODEL=your-model-name
AI_API_KEY=server-side-secret
AI_TIMEOUT_MS=12000
```

Static deployments can leave `VITE_IROP_ASSISTANT_ENDPOINT` blank to use browser-only local KB mode. Deployments with `api/iroha-assistant.js` available should set `VITE_IROP_ASSISTANT_ENDPOINT=/api/iroha-assistant`.

## Request

```http
POST /api/iroha-assistant
Content-Type: application/json
```

```json
{
  "question": "What is Hermes-Yachiyo?",
  "skill": {
    "name": "irop-portal-skill",
    "version": "0.3.0",
    "style": "Be concise, friendly and factual.",
    "boundaries": "Do not invent private biographical details.",
    "dataPolicy": "Public portfolio facts only."
  },
  "profile": {
    "name": "irop",
    "contact": "me@irop.one",
    "summary": "Public profile summary.",
    "links": []
  },
  "localAnswer": {
    "text": "Local fallback answer.",
    "source": "Hermes-Yachiyo",
    "confidence": "high",
    "links": []
  },
  "matchedEntries": []
}
```

## Response

```json
{
  "text": "Hermes-Yachiyo is a desktop-first local personal Agent app...",
  "source": "irop remote assistant",
  "confidence": "remote",
  "details": [
    "Generated with public portfolio memory and server-side retrieval."
  ],
  "runtime": "server-ai",
  "runtimeLabel": "REMOTE AI",
  "links": [
    {
      "label": "Hermes-Yachiyo",
      "href": "https://github.com/kuguya-AI-app-develop/Hermes-Yachiyo"
    }
  ]
}
```

## Fallback

If the browser endpoint is missing, times out, returns a non-2xx response, or sends invalid JSON, Iroha answers from `src/lib/iropAssistant.js` and labels the runtime as `LOCAL KB` or `LOCAL FALLBACK`.

If the included serverless API is available but no model endpoint is configured, it returns `SERVER KB` and answers with the same public knowledge base. This keeps the deployed route useful before a real model/RAG service exists.

Run `npm run smoke:iroha` to verify browser-local, server-local and mock server-AI paths.
