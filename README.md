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

The Iroha pet works in browser-only local KB mode by default.

```bash
npm run smoke:iroha
```

For serverless deployments that can run `api/iroha-assistant.js`, set:

```bash
VITE_IROP_ASSISTANT_ENDPOINT=/api/iroha-assistant
```

Model keys stay server-side through `AI_CHAT_COMPLETIONS_ENDPOINT`, `AI_MODEL`, and `AI_API_KEY`. Static SSH deployment can leave the browser endpoint blank.

## Deployment

Deployment is prepared in `.github/workflows/deploy.yml` and only runs when `main` receives a push.

Required GitHub Actions secrets:

- `DEPLOY_SSH_KEY`: private key that can write to the server deploy path.
- `DEPLOY_USER`: SSH user for `38.47.238.143`.
- `DEPLOY_PATH`: absolute target directory for `irop.one` static files.
- `DEPLOY_PORT`: SSH port, optional; defaults to `22`.

Current development branch should remain `develop`; only push `main` when the production deploy is intended.
