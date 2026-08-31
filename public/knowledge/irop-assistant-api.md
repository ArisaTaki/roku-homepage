# Iroha Assistant API Contract

The frontend works without a server. When `VITE_IROP_ASSISTANT_ENDPOINT` is configured, it can ask a server-side assistant first and fall back to local retrieval if the server is unavailable.

Do not put model API keys in the browser. The endpoint should be a server you control.

This repo includes a Vercel-style serverless entry at `api/iroha-assistant.ts`. Without model settings it still answers from the same public knowledge base on the server. With server-only model settings it calls an OpenAI-compatible chat-completions endpoint.

## Environment

```bash
VITE_IROP_ASSISTANT_ENDPOINT=/api/iroha-assistant
AI_API_KEY=server-side-secret
AI_MODEL=k3-256k
AI_CHAT_COMPLETIONS_ENDPOINT=https://api.kimi.com/coding/v1/chat/completions
AI_THINKING=disabled
AI_REASONING_EFFORT=none
AI_TEMPERATURE=0.6
AI_RATE_LIMIT_MAX=10
AI_RATE_LIMIT_WINDOW_HOURS=6
AI_CACHE_TTL_MS=21600000
AI_CACHE_MAX=128
AI_TIMEOUT_MS=30000
```

Static deployments can leave `VITE_IROP_ASSISTANT_ENDPOINT` blank to use browser-only local KB mode. Deployments with `api/iroha-assistant.ts` available should set `VITE_IROP_ASSISTANT_ENDPOINT=/api/iroha-assistant`.

Set `AI_CHAT_COMPLETIONS_ENDPOINT` and `AI_MODEL` alongside the matching server-only key. The production example uses Kimi K3 256K with `AI_REASONING_EFFORT=none` and `AI_TEMPERATURE=0.6`, so the small assistant receives direct `content` replies instead of spending its output budget on `reasoning_content`. Providers that use a `thinking` object can omit `AI_REASONING_EFFORT` and set `AI_THINKING` instead.

`AI_RATE_LIMIT_MAX` and `AI_RATE_LIMIT_WINDOW_HOURS` guard model usage per client IP. The default is 10 remote model questions per 6 hours. Short greetings and over-long questions are handled locally and do not consume the remote model quota. Other questions are sent to the server model when configured, so the model can classify the intent and either answer from public memory or refuse politely.

Successful remote answers are cached in memory by normalized question, language and model. The default cache keeps up to 128 answers for 6 hours, so repeated starter questions return immediately without consuming another model request.

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
    "version": "0.4.0",
    "style": "Cute, friendly, concise and factual. Follow the visitor's language when possible.",
    "boundaries": "Do not reveal or infer private identity, employer, school, address, income or private contact details.",
    "dataPolicy": "Public portfolio facts only."
  },
  "profile": {
    "name": "八六",
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
  "kind": "answer",
  "mood": "happy",
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

If the browser endpoint is missing, times out, returns a non-2xx response, or sends invalid JSON, Iroha answers from `src/lib/iropAssistant.ts` and labels the runtime as `LOCAL KB` or `LOCAL FALLBACK`.

If the included serverless API is available but no model endpoint is configured, it returns `SERVER KB` and answers with the same public knowledge base. This keeps the deployed route useful before a real model/RAG service exists.

Private-boundary, unknown-topic and unrelated requests are normally classified by the configured model. The model is instructed to return `kind: "refusal"` or `kind: "unknown"` with a concise explanation instead of inventing details. If the model is unavailable or rate-limited, the local fallback gives the same kind of gentle refusal.

Short greetings such as `你好`, `hello` and `こんにちは` are handled locally as `kind: "guide"` so they do not spend model quota. Very long questions are rejected locally with a short reason; this keeps the assistant panel compact and protects model usage.

Run `npm run smoke:iroha` to verify browser-local, server-local and mock server-AI paths.
