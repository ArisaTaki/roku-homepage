/**
 * Serve an existing production build and capture real browser loading behavior.
 *
 * npx tsx tools/check-loading.ts --dist dist --port 4181 --report /tmp/roku-loading.json
 * Add --delay-model-ms 15000 or --block model|media to exercise slow/failing assets.
 * --delay-code-ms 4000 delays code absent from the HTML; --delay-media-ms 4000
 * delays images/audio/video. Overlapping delay options use their maximum.
 * Open the printed URL in a browser. Reports use uncompressed response bytes, not
 * an estimate of CDN transfer size; the injected probe exists only in this server.
 */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const argumentsByName = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index];
  const value = process.argv[index + 1];
  if (!name?.startsWith("--") || !value) throw new Error("Expected --name value pairs.");
  argumentsByName.set(name, value);
}
const allowedArguments = ["--dist", "--port", "--report", "--delay-model-ms", "--delay-code-ms", "--delay-media-ms", "--block"];
for (const name of argumentsByName.keys()) {
  if (!allowedArguments.includes(name)) throw new Error(`Unknown argument: ${name}`);
}
const root = resolve(argumentsByName.get("--dist") ?? "dist");
const port = Number(argumentsByName.get("--port") ?? 4181);
const delayModelMs = Number(argumentsByName.get("--delay-model-ms") ?? 0);
const delayCodeMs = Number(argumentsByName.get("--delay-code-ms") ?? 0);
const delayMediaMs = Number(argumentsByName.get("--delay-media-ms") ?? 0);
const block = argumentsByName.get("--block");
const reportPath = resolve(argumentsByName.get("--report") ?? `/tmp/roku-loading-${port}.json`);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port.");
if ([delayModelMs, delayCodeMs, delayMediaMs].some((delay) => !Number.isFinite(delay) || delay < 0)) {
  throw new Error("Delays must be finite non-negative numbers.");
}
if (block && block !== "model" && block !== "media") throw new Error("--block must be model or media.");
const entryHtml = await readFile(resolve(root, "index.html"), "utf8");
const entryAssets = new Set([...entryHtml.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => new URL(match[1], "http://127.0.0.1").pathname));

type RequestRecord = {
  path: string;
  startedAtMs: number;
  finishedAtMs?: number;
  status?: number;
  responseBytes?: number;
  delayMs?: number;
  category: "model" | "media" | "code" | "other";
};
type BrowserMetric = { event: string; atMs: number; [key: string]: unknown };
const requests: RequestRecord[] = [];
const metrics: BrowserMetric[] = [];
let navigationStartedAt = 0;
let writeQueue = Promise.resolve();

function report() {
  const loaderGone = metrics.find((entry) => entry.event === "loader-gone");
  const completed = requests.filter((entry) => entry.status === 200);
  return {
    root, port, delayModelMs, delayCodeMs, delayMediaMs, block: block ?? null,
    byteDefinition: "Uncompressed successful HTTP response body bytes; probe traffic excluded.",
    startedAt: navigationStartedAt ? new Date(navigationStartedAt).toISOString() : null,
    summary: {
      requestCount: requests.length,
      successfulRequests: completed.length,
      responseBytes: completed.reduce((sum, entry) => sum + (entry.responseBytes ?? 0), 0),
      loaderGoneMs: loaderGone?.atMs ?? null,
      categories: Object.fromEntries(["model", "media", "code", "other"].map((category) => [category, {
        requests: requests.filter((entry) => entry.category === category).length,
        responseBytes: completed.filter((entry) => entry.category === category)
          .reduce((sum, entry) => sum + (entry.responseBytes ?? 0), 0),
      }])),
    },
    requests, metrics,
  };
}

function saveReport() {
  const json = JSON.stringify(report(), null, 2);
  writeQueue = writeQueue.then(() => writeFile(reportPath, json)).catch((error: unknown) => {
    console.error("Could not save loading report:", error);
  });
}

// Keep this probe self-contained: it is inserted before the production scripts.
const probe = String.raw`<script>
(() => {
  const started = performance.now();
  let sawLoader = false;
  let sentReady = false;
  let sentGone = false;
  let scheduled = false;
  const observed = new Set();
  const paints = [];
  function send(event, extra = {}) {
    fetch('/__loading/metric', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, keepalive: true,
      body: JSON.stringify({event, atMs: performance.now(), ...extra})
    }).catch(() => {});
  }
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        paints.push({name: entry.name, startTime: entry.startTime});
      }
    }).observe({type: 'paint', buffered: true});
  } catch (_) {}
  const viewportObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        send('preview-visible', {
          className: String(entry.target.className),
          scrollY: window.scrollY,
          top: entry.boundingClientRect.top,
          left: entry.boundingClientRect.left
        });
        viewportObserver.unobserve(entry.target);
      }
    }
  }, {threshold: 0.01});
  function snapshot(event) {
    send(event, {
      loaderPresent: !!document.querySelector('.boot-loader'),
      appReady: !!document.querySelector('.app-shell.is-ready'),
      openingState: document.querySelector('[data-opening-state]')?.getAttribute('data-opening-state'),
      heroImageReady: [...document.querySelectorAll('.festival-keyvisual')]
        .some(image => image.complete && image.naturalWidth > 0),
      petImageReady: document.querySelector('.pixel-pet')?.getAttribute('data-image-ready') === 'true',
      mountedPreviews: [...document.querySelectorAll('[data-preview-active]')].map(node => ({
        className: String(node.className), active: node.getAttribute('data-preview-active') === 'true'
      })),
      scrollY: window.scrollY,
      viewport: {width: window.innerWidth, height: window.innerHeight},
      paints,
      canvases: [...document.querySelectorAll('canvas')].map(node => ({
        className: String(node.className), width: node.width, height: node.height,
        parentClassName: node.parentElement ? String(node.parentElement.className) : ''
      })),
      resources: performance.getEntriesByType('resource')
        .filter(entry => !entry.name.includes('/__loading/'))
        .map(entry => ({
          name: entry.name, initiatorType: entry.initiatorType, startTime: entry.startTime,
          duration: entry.duration, transferSize: entry.transferSize,
          decodedBodySize: entry.decodedBodySize
        }))
    });
  }
  function inspect() {
    scheduled = false;
    const loader = document.querySelector('.boot-loader');
    sawLoader ||= !!loader;
    if (!sentReady && document.querySelector('.app-shell.is-ready')) {
      sentReady = true;
      snapshot('app-ready');
    }
    if (sawLoader && !loader && !sentGone) {
      sentGone = true;
      snapshot('loader-gone');
    }
    for (const node of document.querySelectorAll('.work-card, .mobile-work')) {
      if (!observed.has(node)) { observed.add(node); viewportObserver.observe(node); }
    }
  }
  new MutationObserver(() => {
    if (!scheduled) { scheduled = true; setTimeout(inspect, 50); }
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});
  addEventListener('error', event => send('error', {message: event.message || 'Resource error'}));
  addEventListener('unhandledrejection', event => send('unhandled-rejection', {message: String(event.reason)}));
  document.addEventListener('DOMContentLoaded', () => { inspect(); snapshot('dom-content-loaded'); });
  addEventListener('load', () => snapshot('window-load'));
  for (const ms of [1000, 3000, 5000, 10000, 20000, 30000]) {
    setTimeout(() => { inspect(); snapshot('snapshot-' + ms); }, ms);
  }
  addEventListener('pagehide', () => snapshot('pagehide'));
  send('probe-start', {probeStartedAtMs: started});
})();
</script>`;

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4",
  ".webm": "video/webm", ".ico": "image/x-icon",
};
const isModel = (path: string) => path.startsWith("/models/") || /live2dcubismcore/i.test(path);
const isMediaFile = (path: string) => /\.(webp|png|jpe?g|gif|avif|svg|mp4|webm|mp3|ogg|wav)$/i.test(path);
const isMedia = (path: string) => isModel(path) || isMediaFile(path);

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/__loading/report") {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify(report(), null, 2));
    return;
  }
  if (url.pathname === "/__loading/metric" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) {
      body += String(chunk);
      if (body.length > 2_000_000) { response.writeHead(413); response.end(); return; }
    }
    try {
      const metric: BrowserMetric = JSON.parse(body);
      if (typeof metric.event !== "string" || typeof metric.atMs !== "number") throw new Error("Invalid metric");
      metrics.push(metric);
      if (["app-ready", "loader-gone", "error", "unhandled-rejection", "preview-visible"].includes(metric.event)) {
        console.log(`[browser ${metric.atMs.toFixed(0)}ms] ${metric.event}`);
      }
      saveReport();
      response.writeHead(204); response.end();
    } catch {
      response.writeHead(400); response.end("Invalid metric");
    }
    return;
  }
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { response.writeHead(400); response.end(); return; }
  if (pathname === "/" || pathname === "/index.html") {
    navigationStartedAt = Date.now();
    requests.length = 0;
    metrics.length = 0;
  }
  const record: RequestRecord = {
    path: pathname,
    startedAtMs: navigationStartedAt ? Date.now() - navigationStartedAt : 0,
    category: isModel(pathname) ? "model" : isMedia(pathname) ? "media" : /\.(js|css)$/i.test(pathname) ? "code" : "other",
  };
  requests.push(record);
  response.once("finish", () => {
    record.finishedAtMs = Date.now() - navigationStartedAt;
    record.status = response.statusCode;
    saveReport();
  });
  try {
    const filePath = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!filePath.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    if (block && (block === "model" ? isModel(pathname) : isMedia(pathname))) {
      response.writeHead(503, { "Cache-Control": "no-store" }); response.end("Blocked by loading check"); return;
    }
    const delayMs = Math.max(
      isModel(pathname) ? delayModelMs : 0,
      /\.(js|css)$/i.test(pathname) && !entryAssets.has(pathname) ? delayCodeMs : 0,
      isMediaFile(pathname) ? delayMediaMs : 0,
    );
    if (delayMs) {
      record.delayMs = delayMs;
      await new Promise((done) => setTimeout(done, delayMs));
    }
    let contents = await readFile(filePath);
    if (extname(filePath) === ".html") contents = Buffer.from(contents.toString().replace("<head>", "<head>" + probe));
    record.responseBytes = contents.length;
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Content-Length": contents.length,
      "Cache-Control": "no-store",
    });
    response.end(contents);
  } catch {
    response.writeHead(404); response.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Loading check: http://127.0.0.1:${port}/`);
  console.log(`Build: ${root}`);
  console.log(`Report: ${reportPath} (or GET /__loading/report)`);
  console.log(`Delays: model ${delayModelMs}ms, deferred code ${delayCodeMs}ms, media ${delayMediaMs}ms; blocked: ${block ?? "none"}. Navigation resets this server's report.`);
});
