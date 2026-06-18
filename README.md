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

## Deployment

Deployment is prepared in `.github/workflows/deploy.yml` and only runs when `main` receives a push.

Required GitHub Actions secrets:

- `DEPLOY_SSH_KEY`: private key that can write to the server deploy path.
- `DEPLOY_USER`: SSH user for `38.47.238.143`.
- `DEPLOY_PATH`: absolute target directory for `irop.one` static files.
- `DEPLOY_PORT`: SSH port, optional; defaults to `22`.

Current development branch should remain `develop`; only push `main` when the production deploy is intended.
