/**
 * Check artwork geometry in a real browser against an existing production build.
 *
 * npx tsx tools/check-artwork-layout.ts --dist dist --port 4198 --report /tmp/roku-artwork.json
 * Resize the browser, or press “重新检查” after changing the language. Each check
 * waits for the opening screen and stable geometry. Samples accumulate across
 * navigations for this server process; GET /__artwork/report returns the report.
 * Add ?coarse=1 to simulate JS pointer/hover queries while preserving the native
 * width/orientation evaluation. This is not physical touch-device or visual QA.
 *
 * Suggested viewport matrix (CSS pixels; use both native and coarse fixtures):
 * 320x568, 360x640, 375x667, 390x844, 414x896, 430x932, 568x320, 667x375,
 * 699x900, 700x900, 750x950, 768x1024, 820x1180, 834x1194, 950x750,
 * 1000x500, 1001x501, 1024x768, 1024x1366, 1100x800, 1101x800,
 * 1180x820, 1280x800, 1366x768, 1400x900, 1401x900, 1440x900,
 * 1920x1080, 2560x1440, 3440x1440, 3840x2160. Check EN, 中文 and 日本語.
 * Results establish loading/geometry only, not attractiveness or smoothness.
 */
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const options = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index];
  const value = process.argv[index + 1];
  if (!["--dist", "--port", "--report"].includes(name) || !value) {
    throw new Error("Expected --dist, --port or --report followed by a value.");
  }
  options.set(name, value);
}
const root = resolve(options.get("--dist") ?? "dist");
const port = Number(options.get("--port") ?? 4198);
const reportPath = resolve(options.get("--report") ?? `/tmp/roku-artwork-${port}.json`);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid port.");
await readFile(resolve(root, "index.html"));

type Sample = {
  viewport: { width: number; height: number; [key: string]: unknown };
  layout: string | null;
  phoneNav: boolean;
  errors: string[];
  [key: string]: unknown;
};
const samples: Sample[] = [];
const startedAt = new Date().toISOString();
let writeQueue = Promise.resolve();
function report() {
  return {
    root, port, startedAt,
    scope: "Real browser DOM geometry and image decoding; not visual or physical-device certification.",
    summary: {
      samples: samples.length,
      passed: samples.filter((sample) => sample.errors.length === 0).length,
      failed: samples.filter((sample) => sample.errors.length > 0).length,
    },
    samples,
  };
}
function saveReport() {
  const json = JSON.stringify(report(), null, 2);
  const write = writeQueue.then(() => writeFile(reportPath, json));
  writeQueue = write.catch(() => {});
  return write;
}

// This script is injected only by this local server, before production scripts.
const probe = String.raw`<script>
(() => {
  const coarse = new URLSearchParams(location.search).get('coarse') === '1';
  if (coarse) {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const original = String(query);
      const simulated = original
        .replace(/\(\s*(?:any-)?pointer\s*:\s*(coarse|fine|none)\s*\)/gi,
          (_, value) => value.toLowerCase() === 'coarse' ? '(min-width: 0px)' : '(max-width: -1px)')
        .replace(/\(\s*(?:any-)?hover\s*:\s*(none|hover)\s*\)/gi,
          (_, value) => value.toLowerCase() === 'none' ? '(min-width: 0px)' : '(max-width: -1px)');
      const nativeList = nativeMatchMedia(simulated);
      if (simulated === original) return nativeList;
      return new Proxy(nativeList, {
        get(target, key) {
          if (key === 'media') return original;
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
        set(target, key, value) { return Reflect.set(target, key, value, target); }
      });
    };
  }
  let status;
  let generation = 0;
  let resizeTimer;
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const rounded = value => Math.round(value * 100) / 100;
  const visible = node => !!node && node.getClientRects().length > 0
    && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'none';
  const artwork = () => [...document.querySelectorAll('.festival-artwork')].find(visible);
  function rect(node) {
    if (!node) return null;
    const bounds = node.getBoundingClientRect();
    return Object.fromEntries(['left', 'top', 'right', 'bottom', 'width', 'height']
      .map(key => [key, rounded(bounds[key])]));
  }
  function geometry() {
    const figure = artwork();
    const style = figure && getComputedStyle(figure);
    const nav = [...document.querySelectorAll('.floating-navigation.is-flow .nav-card')].find(visible);
    return {
      viewport: {width: innerWidth, height: innerHeight, devicePixelRatio},
      layout: document.querySelector('.app-shell')?.getAttribute('data-layout') ?? null,
      phoneNav: [...document.querySelectorAll('.site-nav')].some(visible),
      language: document.documentElement.lang,
      figure: rect(figure),
      // Computed sizes exclude rotation; bounding boxes do not preserve aspect ratio.
      cssWidth: style ? parseFloat(style.width) : 0,
      cssHeight: style ? parseFloat(style.height) : 0,
      nav: rect(nav),
      documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      scroll: {x: rounded(scrollX), y: rounded(scrollY)}
    };
  }
  async function check(reason) {
    const token = ++generation;
    status.textContent = '等待开场及布局稳定…';
    status.dataset.result = 'waiting';
    let previous = '';
    let stableSince = 0;
    let stableFrames = 0;
    while (token === generation) {
      const now = await frame();
      if (document.querySelector('.boot-loader') || !document.querySelector('.app-shell.is-ready')) {
        previous = ''; stableFrames = 0; continue;
      }
      const current = JSON.stringify(geometry());
      if (current !== previous) {
        previous = current; stableSince = now; stableFrames = 0;
      } else if (++stableFrames >= 2 && now - stableSince >= 160) break;
    }
    if (token !== generation) return;
    const figure = artwork();
    const image = figure?.querySelector('.festival-keyvisual');
    let decoded = false;
    if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      try { await image.decode(); decoded = true; } catch (_) {}
    }
    await frame();
    await frame();
    if (token !== generation) return;
    const measured = geometry();
    const errors = [];
    const ratio = measured.cssHeight > 0 ? measured.cssWidth / measured.cssHeight : null;
    if (!figure || !(measured.cssWidth > 0 && measured.cssHeight > 0)) errors.push('主图缺失或没有尺寸');
    else if (ratio < 0.9 || ratio > 1.12) errors.push('主图比例超出 0.90–1.12：' + ratio.toFixed(3));
    if (measured.documentWidth > innerWidth + 1) errors.push('页面横向溢出 ' + (measured.documentWidth - innerWidth) + 'px');
    if (measured.layout === 'flow' && measured.nav && measured.figure) {
      const a = measured.nav, b = measured.figure;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
        && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) errors.push('平板导航与主图相交');
    }
    if (!decoded) errors.push('主图未完成解码');
    const sample = {
      reason, at: new Date().toISOString(), href: location.href,
      fixture: {coarse, scope: 'JavaScript pointer/hover media queries only'},
      ...measured, ratio: ratio === null ? null : rounded(ratio),
      image: {
        decoded, complete: image?.complete ?? false,
        naturalWidth: image?.naturalWidth ?? 0, naturalHeight: image?.naturalHeight ?? 0,
        source: image?.getAttribute('data-source') || image?.currentSrc || image?.getAttribute('src') || null,
        currentSrc: image?.currentSrc ?? null, srcset: image?.getAttribute('srcset') ?? null
      }, errors
    };
    const result = errors.length ? 'FAIL' : 'PASS';
    status.dataset.result = result.toLowerCase();
    status.textContent = result + ' ' + innerWidth + '×' + innerHeight + ' ' + measured.layout
      + ' ' + measured.language + ' 比例 ' + (ratio === null ? '—' : ratio.toFixed(3))
      + (errors.length ? ' · ' + errors.join('；') : ' · 图像已解码，无溢出或相交');
    try {
      const response = await fetch('/__artwork/sample', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(sample)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const saved = await response.json();
      if (token === generation) status.textContent += ' · 样本 #' + saved.sequence;
    } catch (error) {
      if (token === generation) status.textContent += ' · 报告保存失败：' + error.message;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('aside');
    bar.id = 'artwork-layout-probe';
    bar.style.cssText = 'position:fixed;z-index:2147483647;bottom:8px;left:8px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:6px 8px;background:#fff;color:#10202a;border:1px solid #678;font:12px/1.4 monospace;overflow-wrap:anywhere';
    const button = document.createElement('button');
    button.textContent = '重新检查';
    button.style.cssText = 'color:#10202a;background:#fff;border:1px solid #678;padding:4px 8px;margin-right:8px;font:inherit';
    status = document.createElement('span');
    status.id = 'artwork-layout-status';
    status.setAttribute('aria-live', 'polite');
    bar.append(button, status);
    document.body.appendChild(bar);
    button.addEventListener('click', () => void check('manual'));
    addEventListener('resize', () => {
      generation++;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => void check('resize'), 200);
    });
    void check('navigation');
  });
  addEventListener('pagehide', () => { generation++; clearTimeout(resizeTimer); });
})();
</script>`;

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".woff": "font/woff", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg",
};
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/__artwork/report" && request.method === "GET") {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify(report(), null, 2));
    return;
  }
  if (url.pathname === "/__artwork/sample" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) {
      body += String(chunk);
      if (body.length > 64_000) { response.writeHead(413); response.end(); return; }
    }
    let sample: Sample;
    try {
      sample = JSON.parse(body);
      if (!sample || !Number.isFinite(sample.viewport?.width) || !Number.isFinite(sample.viewport?.height)
        || sample.viewport.width <= 0 || sample.viewport.height <= 0
        || !["desktop", "flow", null].includes(sample.layout)
        || typeof sample.phoneNav !== "boolean" || !Array.isArray(sample.errors)
        || !sample.errors.every((error) => typeof error === "string")) throw new Error("Invalid sample");
    } catch { response.writeHead(400); response.end("Invalid sample"); return; }
    const sequence = samples.length + 1;
    samples.push({ ...sample, sequence, receivedAt: new Date().toISOString() });
    try {
      await saveReport();
      console.log(`[${sequence}] ${sample.errors.length ? "FAIL" : "PASS"} ${sample.viewport.width}x${sample.viewport.height} ${sample.layout} ${sample.errors.join("; ")}`);
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ sequence }));
    } catch (error) {
      console.error("Could not save artwork report:", error);
      response.writeHead(500); response.end("Could not save report");
    }
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
  }
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { response.writeHead(400); response.end(); return; }
  const filePath = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!filePath.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  try {
    let contents = await readFile(filePath);
    if (extname(filePath) === ".html") contents = Buffer.from(contents.toString().replace("<head>", "<head>" + probe));
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Content-Length": contents.length, "Cache-Control": "no-store",
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch {
    // A build without an .ico may still declare an SVG favicon in its HTML.
    response.writeHead(pathname === "/favicon.ico" ? 204 : 404);
    response.end(pathname === "/favicon.ico" ? undefined : "Not found");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Artwork layout check: http://127.0.0.1:${port}/ (touch fixture: ?coarse=1)`);
  console.log(`Build: ${root}`);
  console.log(`Report: ${reportPath} (GET /__artwork/report). Samples accumulate until the server stops.`);
});
