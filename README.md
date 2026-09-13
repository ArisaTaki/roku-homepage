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

## Exhibition layout

The homepage keeps a horizontal exhibition on desktop, scaling its shared design coordinates, project anchors and scroll distance together for larger screens. Windows up to 1100px wide, touch tablets up to 1400px wide and portrait windows up to 1400px wide use a vertical layout; wider vertical layouts place the hero content in two columns. A persistent menu provides project navigation and Chinese, English and Japanese language switching on every layout.

Its poster styling combines an oval character visual, tilted two-color headings, cloud motifs, halftone dots, Japanese geometric patterns, ticket navigation and consistent exhibition labels. The hero reuses the existing gallery image `kaguya-visual-02.webp` (about 265KB), prepares it with priority and shares its decoded image cache with Gallery; there are no new media files or dependencies. Phones show the hero, work entrance and assistant in that order.

Animated previews in the vertical layout play when sufficiently visible and provide a play/pause button. Reduced-motion preferences disable automatic preview playback; visitors can still start a preview explicitly. Desktop wheels and trackpads use a gentle Lenis glide, while vertical layouts retain native touch-scroll momentum.

With `npm run preview`, check Chinese, English and Japanese titles for wrapping, use the exhibition entrance and menu to reach each work, and verify card layout, playback controls and links on phones, portrait/landscape tablets and large desktop screens. Check native touch scrolling on real devices as well as responsive browser viewports. Disable browser caching and confirm the shared hero/Gallery image and prepared gallery images download only once; block resources and check that the page remains usable.

## Loading performance

After React mounts, the opening overlay stays for at least 700ms while preparing the hero artwork, first-screen fonts and Hermes preview resources. Readiness requires two animation frames and preparation to settle, with a preparation limit of 1800ms followed by a 360ms fade-out. Slow or failed resources release the page with its fallbacks; Live2D initialization does not block the opening. Save-Data and 2G connections skip Hermes prewarming while still preparing the visible first screen.

Background resource preparation starts 800ms after the homepage becomes ready, with at most two previews in progress. Approaching a card or using project navigation starts its preparation immediately. Save-Data and 2G connections skip automatic preparation; hidden pages defer new background preview jobs. Preparation loads code and assets without mounting animations or calling the AI demo API. Live2D preparation and rendering share in-flight and cached model bytes.

Cards retain a static cover with their title and description while preparing. Hermes and Gallery switch to animation once their resources are ready, reusing decoded Blob URLs instead of downloading their images again. Live2D retains its avatar while the model loads or if it fails. Background downloads continue after the first screen appears, so total transferred bytes increase over time.

Previews pause animation updates when their cards leave the viewport or the page is hidden, retaining mounted models and prepared resources to resume on return. Replay previews skip duplicate seeks within each 30fps frame. Nature yields to browser rendering between its initial WebGL, model and first-frame preparation stages and keeps its poster visible until the first frame is ready.

Validate with `npm run build`, `npm run check:iroha` and `npx tsx --test tools/check-boot-readiness.ts tools/check-live2d-resource-cache.ts`. Run `npm run preview` for manual checks at desktop and phone widths:

- Reload with cache disabled, stay on the homepage, then scroll through the works; check background preparation and preview transitions.
- Use project navigation immediately after the homepage appears; check its cover, preview, language switching and layout.
- Delay or block resources; check that useful covers remain and the homepage and other projects stay usable.

For a loading report, run `npx tsx tools/check-loading.ts --dist dist --port 4181 --report /tmp/roku-loading.json`, then open the printed URL. Optional flags include `--delay-model-ms 1500`, `--delay-code-ms 4000`, `--delay-media-ms 4000` and `--block media`. Reports count uncompressed response body bytes and reset on each homepage navigation; save a copy before scrolling and record how long the page has been open.

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
