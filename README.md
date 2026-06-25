# roku-homepage

Vite + React + TailwindCSS personal homepage for `irop.one`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Iroha Assistant

The Iroha pet works in browser-only local KB mode by default, with refusal rules for private or unrelated questions.

```bash
npm run smoke:iroha
npm run check:iroha
```

For local Vite dev/preview or serverless deployments that can run `api/iroha-assistant.ts`, set:

```bash
VITE_IROP_ASSISTANT_ENDPOINT=/api/iroha-assistant
```

Model keys stay server-side through `AI_API_KEY`, `AI_MODEL`, and `AI_CHAT_COMPLETIONS_ENDPOINT`. With only `AI_API_KEY` set, the included endpoint defaults to DeepSeek's chat-completions API and `deepseek-v4-flash` with `AI_THINKING=disabled` for short website replies. Short greetings and over-long questions stay local; other questions use the model for intent classification and public-memory answers. Remote model calls are rate-limited with `AI_RATE_LIMIT_MAX=10` and `AI_RATE_LIMIT_WINDOW_HOURS=6` by default. Static SSH deployment can leave the browser endpoint blank.

## Deployment

Deployment is prepared in `.github/workflows/deploy.yml` and runs when `main` receives a push. It can also be started manually from the GitHub Actions tab.

The workflow installs dependencies, runs `npm run check:iroha`, builds the Vite app, packages `dist/`, uploads it through SSH, and replaces the server web root used by `irop.one`. It also bundles the Iroha assistant API, installs a private Node runtime on the server, runs the API through `systemd`, and lets nginx proxy `/api/iroha-assistant` to that local service.

Required GitHub Actions secrets:

- `DEPLOY_SSH_KEY`: private key that can write to the server deploy path.
- `DEPLOY_USER`: SSH user for the server.
- `DEPLOY_PATH`: absolute target directory for `irop.one` static files. Current server path: `/home/wwwroot/fufubest.com/dist`.
- `DEPLOY_HOST`: SSH host, optional; defaults to `38.47.238.143`.
- `DEPLOY_PORT`: SSH port, optional; defaults to `22`.
- `API_DEPLOY_PATH`: assistant API target directory, optional; defaults to `/home/wwwroot/irop-one-api`.
- `API_PORT`: local assistant API port, optional; defaults to `8787`.
- `AI_API_KEY`: DeepSeek-compatible API key used only by the server-side assistant.
- `AI_MODEL`, `AI_CHAT_COMPLETIONS_ENDPOINT`, `AI_THINKING`, `AI_TIMEOUT_MS`, `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_HOURS`: optional model/runtime settings.

Current development branch should remain `develop`; only push `main` when the production deploy is intended.
