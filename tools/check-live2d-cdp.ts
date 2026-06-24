import { writeFile } from "node:fs/promises";
import http from "node:http";

type DevToolsPage = {
  type?: string;
  webSocketDebuggerUrl?: string;
};

type CdpEvaluateResult<T> = {
  result: {
    value: T;
  };
};

type CdpInboundMessage = {
  id?: number;
  method?: string;
  params?: {
    type?: string;
    args?: Array<{ value?: unknown; description?: string }>;
    requestId?: string;
    request?: { url?: string };
    encodedDataLength?: number;
    errorText?: string;
  };
  result?: unknown;
  error?: { message?: string };
};

type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type ConsoleEntry = {
  type: string;
  text: string;
};

type NetworkEntry =
  | { id: string; event: "request"; url: string }
  | { id: string; event: "finished"; encodedDataLength: number }
  | { id: string; event: "failed"; errorText: string };

type VisibleShellRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollY: number;
  className: string;
  webgl: boolean;
};

type ScrollInfo = {
  projectTop: number;
  maxScroll: number;
};

const DEBUG_PORT = process.argv[2] ?? "9249";
const TARGET_URL = process.argv[3] ?? "http://127.0.0.1:5173/#project";
const DEBUG_URL = `http://127.0.0.1:${DEBUG_PORT}/json/list`;
const SCREENSHOT_PATH = `/private/tmp/nature-live2d-chrome-${DEBUG_PORT}.png`;

function getJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const pages = await getJson<DevToolsPage[]>(DEBUG_URL);
const page = pages.find((item) => item.type === "page") ?? pages[0];

if (!page?.webSocketDebuggerUrl) {
  throw new Error("No Chrome page found on the debugging port.");
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map<number, PendingCommand>();
const consoleEntries: ConsoleEntry[] = [];
const networkEntries: NetworkEntry[] = [];
let commandId = 0;

ws.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data)) as CdpInboundMessage;

  if (message.method === "Runtime.consoleAPICalled") {
    consoleEntries.push({
      type: message.params?.type ?? "log",
      text: (message.params?.args ?? [])
        .map((arg) => String(arg.value ?? arg.description ?? ""))
        .join(" "),
    });
  }

  if (message.method === "Network.requestWillBeSent") {
    networkEntries.push({
      id: message.params?.requestId ?? "",
      event: "request",
      url: message.params?.request?.url ?? "",
    });
  }

  if (message.method === "Network.loadingFinished") {
    networkEntries.push({
      id: message.params?.requestId ?? "",
      event: "finished",
      encodedDataLength: message.params?.encodedDataLength ?? 0,
    });
  }

  if (message.method === "Network.loadingFailed") {
    networkEntries.push({
      id: message.params?.requestId ?? "",
      event: "failed",
      errorText: message.params?.errorText ?? "",
    });
  }

  if (message.id !== undefined && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)!;
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message ?? "CDP command failed"));
    else resolve(message.result);
  }
});

await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

function cdp<T = Record<string, unknown>>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Network.enable");
await cdp("Input.setIgnoreInputEvents", { ignore: false });
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp("Page.bringToFront");
await cdp("Page.navigate", { url: TARGET_URL });
await wait(1800);
await wait(1200);
const mocProbe = await cdp<CdpEvaluateResult<unknown>>("Runtime.evaluate", {
  expression: `
    Promise.race([
      fetch('/models/yachiyo-web/yachiyo.moc3', { cache: 'no-store' })
        .then(async (response) => ({
          ok: response.ok,
          status: response.status,
          bytes: (await response.arrayBuffer()).byteLength
        }))
        .catch((error) => ({ error: String(error) })),
      new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 15000))
    ])
  `,
  awaitPromise: true,
  returnByValue: true,
});

async function getVisibleNatureShellRect(): Promise<VisibleShellRect | null> {
  const result = await cdp<CdpEvaluateResult<VisibleShellRect | null>>("Runtime.evaluate", {
    expression: `
      (() => {
        const shells = [...document.querySelectorAll('.nature-live2d-remotion-shell')];
        const visible = shells.find((item) => {
          const rect = item.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const horizontallyVisible = centerX > 140 && centerX < window.innerWidth - 140;
          const verticallyVisible = rect.bottom > 40 && rect.top < window.innerHeight - 40;
          return rect.width > 100 && rect.height > 100 && horizontallyVisible && verticallyVisible;
        });
        const rect = visible?.getBoundingClientRect();
        return rect ? {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          scrollY: window.scrollY,
          className: visible.className,
          webgl: !!document.createElement('canvas').getContext('webgl')
        } : null;
      })()
    `,
    returnByValue: true,
  });
  return result.result.value;
}

const scrollInfo = await cdp<CdpEvaluateResult<ScrollInfo | null>>("Runtime.evaluate", {
  expression: `
    (() => {
      const section = document.querySelector('#project');
      return {
        projectTop: section?.offsetTop ?? 0,
        maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      };
    })()
  `,
  returnByValue: true,
});

let rect: VisibleShellRect | null = null;
const { projectTop, maxScroll } = scrollInfo.result.value ?? { projectTop: 0, maxScroll: 0 };
for (const offset of [1200, 1800, 2400, 3000, 3600, 4200, 5000]) {
  await cdp("Runtime.evaluate", {
    expression: `window.scrollTo(0, ${Math.min(maxScroll, projectTop + offset)});`,
  });
  await wait(520);
  rect = await getVisibleNatureShellRect();
  if (rect) break;
}

if (!rect) {
  const diagnostics = await cdp<CdpEvaluateResult<unknown>>("Runtime.evaluate", {
    expression: `
      (() => {
        const shellRects = [...document.querySelectorAll('.nature-live2d-remotion-shell')].map((el, i) => {
          const rect = el.getBoundingClientRect();
          return {
            i,
            className: el.className,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            text: el.closest('.work-card, .mobile-work')?.textContent?.slice(0, 120) ?? ''
          };
        });
        const projectRect = document.querySelector('#project')?.getBoundingClientRect();
        return {
          href: location.href,
          scrollY: window.scrollY,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollHeight: document.documentElement.scrollHeight,
          projectRect: projectRect ? {
            x: projectRect.x,
            y: projectRect.y,
            width: projectRect.width,
            height: projectRect.height
          } : null,
          shellRects
        };
      })()
    `,
    returnByValue: true,
  });
  throw new Error(`Could not find the nature-live2d card. ${JSON.stringify(diagnostics.result.value)}`);
}

const initialState = await cdp<CdpEvaluateResult<unknown>>("Runtime.evaluate", {
  expression: `
    (() => {
      const shell = [...document.querySelectorAll('.nature-live2d-remotion-shell')]
        .find((item) => {
          const rect = item.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const horizontallyVisible = centerX > 140 && centerX < window.innerWidth - 140;
          const verticallyVisible = rect.bottom > 40 && rect.top < window.innerHeight - 40;
          return rect.width > 100 && rect.height > 100 && horizontallyVisible && verticallyVisible;
        });
      const canvas = shell?.querySelector('canvas');
      const badge = shell?.querySelector('.nl2d-runtime-badge')?.textContent?.trim();
      return {
        shellClass: shell?.className ?? null,
        badge,
        canvasCount: shell?.querySelectorAll('canvas').length ?? 0,
        hasVisibleCanvas: !!canvas && canvas.width > 0 && canvas.height > 0
      };
    })()
  `,
  returnByValue: true,
});

await cdp("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: 10,
  y: 10,
  button: "none",
  buttons: 0,
  pointerType: "mouse",
});

await wait(120);

await cdp("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
  button: "none",
  buttons: 0,
  pointerType: "mouse",
});

await wait(120);

await cdp("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: rect.x + rect.width / 2 + 24,
  y: rect.y + rect.height / 2 + 8,
  button: "none",
  buttons: 0,
  pointerType: "mouse",
});

await wait(9000);

const state = await cdp<CdpEvaluateResult<unknown>>("Runtime.evaluate", {
  expression: `
    (() => {
      const shell = [...document.querySelectorAll('.nature-live2d-remotion-shell')]
        .find((item) => {
          const rect = item.getBoundingClientRect();
          return rect.width > 100 && rect.height > 100;
        });
      const canvas = shell?.querySelector('canvas');
      const canvasRect = canvas?.getBoundingClientRect();
      const badge = shell?.querySelector('.nl2d-runtime-badge')?.textContent?.trim();
      return {
        shellClass: shell?.className ?? null,
        badge,
        canvasCount: shell?.querySelectorAll('canvas').length ?? 0,
        canvasSize: canvas ? {
          width: canvas.width,
          height: canvas.height,
          cssWidth: canvasRect.width,
          cssHeight: canvasRect.height
        } : null,
        webgl: !!document.createElement('canvas').getContext('webgl')
      };
    })()
  `,
  returnByValue: true,
});

const screenshot = await cdp<{ data: string }>("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
await writeFile(SCREENSHOT_PATH, Buffer.from(screenshot.data, "base64"));
ws.close();

console.log(JSON.stringify({
  rect,
  initialState: initialState.result.value,
  mocProbe: mocProbe.result.value,
  state: state.result.value,
  consoleEntries,
  networkEntries: networkEntries.filter((entry) => (
    "url" in entry
      ? entry.url.includes("yachiyo") || entry.url.includes("textures") || entry.url.includes("live2d") || entry.url.includes("cubism") || entry.url.includes("pixi")
      : true
  )),
  screenshot: SCREENSHOT_PATH,
}, null, 2));
