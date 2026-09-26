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

The homepage keeps a horizontal exhibition on desktop, scaling its shared design coordinates, project anchors and scroll distance together for larger screens. Windows up to 1100px wide, touch tablets up to 1400px wide and portrait windows up to 1400px wide use a vertical layout; wider vertical layouts place the hero content in two columns. Phones use the compact persistent menu, while desktop and tablets retain the floating navigation. Both provide project navigation and Chinese, English and Japanese language switching; tablets keep their vertical content layout.

Its poster styling combines an oval character visual, tilted two-color headings, cloud motifs, halftone dots, Japanese geometric patterns, ticket navigation and consistent exhibition labels. The hero frame preserves its width-to-height ratio: 1.08 on phones, 0.96 on tablets and 720:740 on desktop. Tablet height follows the frame width instead of a viewport-height cap that could flatten the artwork. Phones show the hero, work entrance and assistant in that order.

The hero uses three WebP sizes derived from the official 1715×1382 artwork, choosing a size from its displayed frame dimensions and device pixel ratio. It prepares the selected image through the shared decoded-image cache before the opening completes. Resizing can upgrade image detail while retaining the current image until its replacement decodes. Gallery keeps its separately sized preview image. The hero's extra image overscan is 104%, reduced from 120% to retain more detail. These assets add no runtime dependency; source and conversion details are in [the hero asset notes](public/assets/hero/README.md).

Animated previews in the vertical layout play when sufficiently visible and provide a play/pause button. Reduced-motion preferences disable automatic preview playback; visitors can still start a preview explicitly. Desktop wheels and trackpads use a gentle Lenis glide, while vertical layouts retain native touch-scroll momentum.

With `npm run preview`, check Chinese, English and Japanese titles for wrapping, use the exhibition entrance and menu to reach each work, and verify card layout, playback controls and links on phones, portrait/landscape tablets and large desktop screens. Check native touch scrolling on real devices as well as responsive browser viewports. Disable browser caching and confirm each selected hero image and prepared gallery image downloads only once; block resources and check that the page remains usable.

For a repeatable artwork check, build the site, run `npx tsx tools/check-artwork-layout.ts --dist dist --port 4198 --report /tmp/roku-artwork.json`, and open the printed URL. Resize across phone, tablet and desktop sizes, including narrow landscape windows and either side of layout breakpoints; the tool's header lists the viewport matrix. Check all three languages and use `?coarse=1` for the JavaScript touch-pointer fixture. Each sample waits for the opening and stable geometry, then records image decoding, frame ratio, horizontal overflow and tablet navigation overlap. Samples accumulate in the JSON report. This measures geometry and loading; it does not replace visual review or real-device scrolling checks.

## Loading performance

The opening waits for resource preparation: decoded hero artwork and pet sprites, first-screen fonts and, on normal connections, Hermes followed by Gallery, Shader, Blog, Tsukuyomi and Nature's lightweight module and cover. Prepared lightweight previews mount behind the opening overlay and stay paused while offscreen; Nature Live2D only prewarms model bytes in the background and initializes its renderer on first entering the viewport, keeping offscreen GPU initialization out of the homepage opening. Images, including pet sprites and preview covers, share a subscribable decoded-image cache so their mounted components reuse prepared resources.

After preparation completes, readiness requires 160ms of consecutive stable animation frames and a minimum opening duration of 700ms, followed by a 360ms fade-out. After 12 seconds, a slow-loading notice appears; this does not mark resources ready or force the page open. The page enters automatically once preparation and the frame check complete. Failed preparation offers reload or early entry, and visitors can choose to enter from the slow-loading notice as well.

The heavy Live2D model warms in a separate background queue with at most two previews in progress and does not block the opening. Approaching a card or using project navigation starts its preparation immediately. Save-Data and 2G connections prepare the visible first screen but skip automatic preview warming; hidden pages defer new background preview jobs. Resource preparation itself does not call the AI demo API. Live2D preparation and rendering share in-flight and cached model bytes.

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

## Tsukuyomi preview

Run `npm run dev`, then open `/previews/tsukuyomi/index.html`. This is a browser preview of the copied theme CSS with dark/light, scene, reading, and static controls; it is not the full Obsidian application. Use `?device=phone&lang=zh` for the compact phone preview, or change `lang` to `en` or `ja`.

The exhibit uses the unmodified CSS and matching manifest of a published [Tsukuyomi release](https://github.com/kuguya-AI-app-develop/tsukuyomi-Obsidian-theme/releases), with its license and artwork notice alongside them in `public/previews/tsukuyomi/`. `release.json` records the source version and asset hashes. Run `npm run sync:tsukuyomi` to fetch the latest stable release, or append `-- --version 1.2.0` to select an existing release. Downloads are checked against the release SHA-256 list before replacing local files. The same sync generates `src/data/tsukuyomi-release.json` for the displayed version, download links and assistant knowledge; no manual version search-and-replace is needed.

A separate browser scaffold supplies two open tabs and interactive sidebar modules, so the original CSS can demonstrate note entry and navigation bounce. Homepage cards run a short demo only while playing and visible; static mode and system reduced motion stop it. The installed theme remains CSS-only. This demonstrates ordinary tab switching, not the postponed same-tab file-change animation. The iframe isolates theme selectors from the homepage. Preview resources are served with `Cache-Control: no-cache` to revalidate controls as well as theme assets after deployment.

To verify, open the third exhibit on desktop and phone layouts, switch the site's language, and follow its link. Check dark/light, scene/reading, static/minimal controls and the two installation downloads. Browser checks at `393 × 852`, `375 × 667`, `320 × 568`, and `430 × 932` cover the compact phone presentation; they do not replace native iOS, Android, or iPad testing, including keyboard and touch validation.

## Games and creative tools

The homepage links to playable project pages at `/previews/ranlu/index.html`, `/previews/jingang-guild/index.html` and `/previews/naiwa-yuushiya/index.html`. Append `?lang=zh`, `?lang=en` or `?lang=ja` to translate the introduction and controls; the games themselves remain in Chinese. The embedded game downloads and starts only after **Start** is selected. Naiwa is a simplified offline BOT prototype still in development, with no online rooms. Reflex Labs remains a pending homepage exhibit; YKI links to its public repository and is labeled beta.

Static production runtimes are committed under each preview's `game/` directory. To refresh them from explicit local checkouts:

```bash
node tools/sync-game-demos.mjs \
  --ranlu /path/to/ranlu \
  --jingang-guild /path/to/jingang-guild \
  --naiwa-yuushiya /path/to/naiwa-yuushiya-table-game
```

Flags may be used individually. Use clean source revisions; prepare fresh production Web exports with `npm run build:web` in Ranlu and Jingang Guild, and install Naiwa's dependencies with `npm ci` in its checkout first. The two Cocos exports require a local Cocos Creator installation. The sync copies production runtime files from the Cocos exports and builds Naiwa with its online UI and controller removed. It records source commits and file hashes in `demo-manifest.json`; it does not download private repositories or copy their development source trees. This command is a manual import: review its outputs before deploying the site. The automatic main-branch sync described below builds from fixed remote revisions in temporary checkouts instead.

Check with `npm run build`, `npm run check:iroha` and `npx tsx --test tools/check-scene-layout.ts`. In `npm run preview`, open each page, confirm game requests wait for Start, play a move, switch introduction languages and check the controls and game at phone width.

## Deployment

Deployment is prepared in `.github/workflows/deploy.yml` and runs when `main` receives a push. It can also be started manually from the GitHub Actions tab.

The workflow installs dependencies, syncs and validates the published Tsukuyomi release, runs `npm run check:iroha`, builds the Vite app, packages `dist/`, uploads it through SSH, and replaces the server web root used by `irop.one`. It also bundles the Iroha assistant API, installs a private Node runtime on the server, runs the API through `systemd`, and lets nginx proxy `/api/iroha-assistant` to that local service.

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

Current development branch remains `develop`; only push `main` when a production deploy is intended. Production runs queue instead of cancelling an in-flight SSH deployment.

### Theme release synchronization

The theme repository's `npm run release -- …` publishes through the maintainer's existing local GitHub CLI login, then dispatches this repository's `deploy.yml` on `main` with `theme_version`. Its `npm run sync:site -- 1.2.0` retries the website step for an already published version. The deploy workflow syncs the requested release before building and checks the live metadata and CSS digest after upload. No cross-repository token is stored in Actions.

`Check Tsukuyomi release` runs at minutes 7, 22, 37 and 52 of each hour and can also be dispatched manually. It compares the latest stable release's hashes with **production** `release.json`, then starts the existing production workflow only when needed and no deployment is running. It uses the website repository's own temporary `GITHUB_TOKEN`. Scheduled GitHub runs can be delayed; this is a fallback, not an exact 15-minute delivery guarantee. Drafts and prereleases are not deployed.

GitHub schedules execute on the default branch (`develop`). Keep `.github/workflows/sync-tsukuyomi.yml` there as well as on `main`; it explicitly checks out production `main`, so unrelated `develop` work is not deployed. Other workflow code and the website continue to ship from `main`.

To temporarily pin or roll back a theme, set repository variable `TSUKUYOMI_AUTO_SYNC=false` before dispatching `deploy.yml` with the earlier `theme_version`. Re-enable it by removing the variable or setting it to `true`. The deployment still uses the site's existing SSH activation procedure; it is not an atomic server rollback system.

Validation commands: `npm run test:tsukuyomi`, `npm run sync:tsukuyomi -- --check`, `npm run check:iroha`, and `npm run build`. `npm run check:tsukuyomi-deployment` is a read-only comparison with production. Browser checks should include the full preview plus the homepage auto demo, dark/light, three languages, phone drawer, static mode and offscreen pause.

### Game and tool main-branch synchronization

The current automatic mode follows pushes to these source branches in `kuguya-AI-app-develop`; publishing a Release is not required:

| Repository | Branch | Website update |
| --- | --- | --- |
| `ranlu` | `main` | Rebuild and replace the playable Web demo |
| `jingang-guild` | `main` | Rebuild and replace the playable Web demo |
| `naiwa-yuushiya-table-game` | `main` | Rebuild the offline BOT demo, without online rooms |
| `Jev_project` (Reflex Labs) | `main` | Update the latest source revision and update information |
| `YKI-video-generator` | `master` | Update the latest source revision and update information |

Introduction text, screenshots and completion labels remain manually maintained. A push does not remove Naiwa's in-development label or Reflex Labs' pending label. The homepage and preview pages use matching tracking files at `src/data/project-main.json` and `public/knowledge/project-main.json`.

#### Local automatic runner

A Codex heartbeat on the current Mac checks every five minutes while the computer is awake, logged in and online, with Codex running. Offline time and delayed runs postpone synchronization; five minutes is the checking interval, not a deployment deadline. The runner requires the existing authenticated GitHub CLI (`gh`) login, Node/npm and Cocos Creator 3.8.8. That GitHub account needs read access to the source repositories and permission to push the homepage's `main`. **This mode does not require `PROJECT_RELEASE_READ_TOKEN` or a new Actions secret.**

Each run uses the script from the homepage's remote `main`, even if the user's local checkout is behind it. It reads all five source heads and clones the required revisions into temporary directories. Changed Cocos games build with `npm run build:web`; Naiwa builds through the offline Vite adapter. Source repositories and the user's homepage checkout, including uncommitted work, are not modified. Only the homepage's remote `main` snapshot is eligible for publication.

Before publishing, the script requires successful builds and confirms that all five source heads and the homepage's remote `main` still match the revisions it started with. It then creates a scoped commit and pushes normally to homepage `main`, triggering the existing deployment workflow. It does not force-push, rebase or reset user checkouts. If a source changes during a build, the next run processes the newer revision. Build or synchronization failures leave the existing live site in place and preserve temporary failure evidence for diagnosis; the normal deployment workflow still handles server publication.

Normal website deployments no longer fetch game/tool Releases, so an older Release cannot replace a newer demo synchronized from a branch. Tsukuyomi's independent Release synchronization is unchanged.

#### Local commands

```bash
# Read-only comparison of tracked revisions with the five source branches.
npm run check:project-main

# Build changes in temporary checkouts and publish a scoped homepage main commit.
npm run sync:project-main

# After deployment, compare local tracking metadata and game manifests with production.
node tools/sync-project-main.mjs --verify-live
```

`check:project-main` passes `--check`; `sync:project-main` passes `--publish`. Running `node tools/sync-project-main.mjs` without flags checks for changes without publishing. Run the publishing command from a checkout of the current homepage remote `main` when invoking it manually. `--verify-live` is a read-only check and should use the snapshot that was deployed; it does not start a deployment or change the website.

<details>
<summary>Optional manual Release packaging and synchronization</summary>

The older Release tools remain available for deliberate manual use. They are not the active automatic mode. `.github/workflows/sync-project-releases.yml` has no schedule and requires explicit opt-in with repository variable `PROJECT_RELEASE_AUTO_SYNC=true` for manual dispatch. Ordinary deployments do not fetch project Releases. Avoid running Release imports alongside the branch-sync heartbeat: a later branch update will again become the demo source.

#### Prepare a game release

From this homepage checkout, use a clean source checkout and the version you intend to publish (`v1.0.0` below is an example):

```bash
npm run package:game-release -- \
  --game ranlu \
  --version v1.0.0 \
  --source /path/to/ranlu \
  --output /path/to/release-assets
```

`--game` also accepts `jingang-guild` and `naiwa-yuushiya`. The packager runs `npm run build:web` for the Cocos games, then uses the controlled demo sync. `--skip-build` reuses an existing Cocos export subject to freshness checks. Naiwa always builds through the offline Vite adapter.

The output is `irop-web-demo.json.gz` plus `SHA256SUMS.txt`, containing runtime files and their hashes, not the development source tree. The packager does not upload or publish anything; it prints commands with the actual source commit and paths. Review those commands and create a draft release in the corresponding source repository before publishing it:

```bash
gh release create v1.0.0 \
  /path/to/release-assets/irop-web-demo.json.gz \
  /path/to/release-assets/SHA256SUMS.txt \
  --repo kuguya-AI-app-develop/ranlu \
  --target SOURCE_COMMIT --draft --title v1.0.0 --notes 'Web demo release'
gh release edit v1.0.0 --draft=false --repo kuguya-AI-app-develop/ranlu
```

Replace `SOURCE_COMMIT` with the packager's recorded `sourceCommit`, and use the same intended version throughout. Publish only after both assets are attached and the draft is ready.

#### Import a release manually

Use the local GitHub CLI login without copying its credential into Actions:

```bash
npm run check:project-releases -- --use-gh
npm run sync:projects -- --use-gh
npm run sync:projects -- --verify-live
```

`check:project-releases` compares published, non-prerelease upstream releases with production without changing files. `sync:projects` imports their metadata and validated game runtimes into the local checkout; review and deploy those changes explicitly. Games require a complete Web demo package. YKI and Reflex Labs update release metadata only. Drafts and prereleases are ignored. `--verify-live` compares the local release metadata and game manifests with the deployed site.

The optional Actions Release check, unlike the current local branch runner, needs `PROJECT_RELEASE_READ_TOKEN` to read private releases. If using that legacy path, create a dedicated fine-grained token with resource owner `kuguya-AI-app-develop`, access only to `ranlu`, `jingang-guild`, `naiwa-yuushiya-table-game` and `Jev_project`, and **Contents: read-only**. See GitHub's [fine-grained token permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens). Do not copy a general personal `gh` token into Actions.

</details>
