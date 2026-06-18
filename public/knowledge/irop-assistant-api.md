# Iroha Assistant API Contract

The frontend works without a server. When `VITE_IROP_ASSISTANT_ENDPOINT` is configured, it can ask a server-side assistant first and fall back to local retrieval if the server is unavailable.

Do not put model API keys in the browser. The endpoint should be a server you control.

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
  "links": [
    {
      "label": "Hermes-Yachiyo",
      "href": "https://github.com/kuguya-AI-app-develop/Hermes-Yachiyo"
    }
  ]
}
```

## Fallback

If the endpoint is missing, times out, returns a non-2xx response, or sends invalid JSON, Iroha answers from `src/lib/iropAssistant.js` and labels the runtime as `LOCAL KB` or `LOCAL FALLBACK`.
