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

type VisibleShellRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollY: number;
  className: string;
};

type ScrollInfo = {
  projectTop: number;
  maxScroll: number;
};

type DomRectSnapshot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ShaderInitialState = {
  shellClass: string | null;
  canvasCount: number;
  hasVisibleCanvas: boolean;
  title: string | null;
};

type ShaderState = {
  shellClass: string | null;
  canvasCount: number;
  canvasSize: {
    width: number;
    height: number;
    cssWidth: number;
    cssHeight: number;
  } | null;
  webgl: boolean;
  title: string | null;
  codeText: string | null;
  cursorRect: DomRectSnapshot | null;
  activeButtonRect: DomRectSnapshot | null;
};

type DemoCountState = {
  status: string[];
  buttons: number;
};

const DEBUG_PORT = process.argv[2] ?? "9251";
const TARGET_URL = process.argv[3] ?? "http://127.0.0.1:5174/#project";
const PLAY_WAIT_MS = Number(process.argv[4] ?? "6500");
const DEBUG_URL = `http://127.0.0.1:${DEBUG_PORT}/json/list`;
const SCREENSHOT_PATH = `/private/tmp/shader-remotion-chrome-${DEBUG_PORT}.png`;

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
await cdp("Input.setIgnoreInputEvents", { ignore: false });
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp("Page.bringToFront");
await cdp("Page.navigate", { url: TARGET_URL });
await wait(2200);

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

async function getVisibleShaderRect(): Promise<VisibleShellRect | null> {
  const result = await cdp<CdpEvaluateResult<VisibleShellRect | null>>("Runtime.evaluate", {
    expression: `
      (() => {
        const shells = [...document.querySelectorAll('.shader-remotion-shell')];
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
          className: visible.className
        } : null;
      })()
    `,
    returnByValue: true,
  });
  return result.result.value;
}

let rect: VisibleShellRect | null = null;
const { projectTop, maxScroll } = scrollInfo.result.value ?? { projectTop: 0, maxScroll: 0 };
for (const offset of [6200, 7000, 7800, 8600, 9400, 10200, 11000]) {
  await cdp("Runtime.evaluate", {
    expression: `window.scrollTo(0, ${Math.min(maxScroll, projectTop + offset)});`,
  });
  await wait(520);
  await cdp("Runtime.evaluate", {
    expression: `
      (() => {
        const shaderCard = [...document.querySelectorAll('.work-card, .mobile-work')]
          .find((item) => /shader\\.irop\\.one/i.test(item.textContent || ''));
        shaderCard?.scrollIntoView({ block: 'center', inline: 'center' });
      })()
    `,
  });
  await wait(520);
  rect = await getVisibleShaderRect();
  if (rect) break;
}

if (!rect) {
  const diagnostics = await cdp<CdpEvaluateResult<unknown>>("Runtime.evaluate", {
    expression: `
      (() => {
        const shellRects = [...document.querySelectorAll('.shader-remotion-shell')].map((el, i) => {
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
  throw new Error(`Could not find the shader Remotion card. ${JSON.stringify(diagnostics.result.value)}`);
}

const initialState = await cdp<CdpEvaluateResult<ShaderInitialState>>("Runtime.evaluate", {
  expression: `
    (() => {
      const shell = document.querySelector('.shader-remotion-shell');
      const canvas = shell?.querySelector('canvas');
      return {
        shellClass: shell?.className ?? null,
        canvasCount: shell?.querySelectorAll('canvas').length ?? 0,
        hasVisibleCanvas: !!canvas && canvas.width > 0 && canvas.height > 0,
        title: shell?.querySelector('.shader-demo-hero h3')?.textContent?.trim() ?? null
      };
    })()
  `,
  returnByValue: true,
});

await cdp("Input.dispatchMouseEvent", {
  type: "mouseMoved",
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
  button: "none",
  buttons: 0,
  pointerType: "mouse",
});
await wait(PLAY_WAIT_MS);

const state = await cdp<CdpEvaluateResult<ShaderState>>("Runtime.evaluate", {
  expression: `
    (() => {
      const shell = document.querySelector('.shader-remotion-shell');
      const canvas = shell?.querySelector('canvas');
      const canvasRect = canvas?.getBoundingClientRect();
      const gl = canvas?.getContext('webgl');
      const cursorRect = shell?.querySelector('.shader-demo-cursor')?.getBoundingClientRect();
      const activeButtonRect = shell?.querySelector('.shader-demo-tree button.is-active')?.getBoundingClientRect();
      return {
        shellClass: shell?.className ?? null,
        canvasCount: shell?.querySelectorAll('canvas').length ?? 0,
        canvasSize: canvas ? {
          width: canvas.width,
          height: canvas.height,
          cssWidth: canvasRect.width,
          cssHeight: canvasRect.height
        } : null,
        webgl: !!gl,
        title: shell?.querySelector('.shader-demo-hero h3')?.textContent?.trim() ?? null,
        codeText: shell?.querySelector('.shader-demo-code code')?.textContent?.trim().slice(0, 80) ?? null,
        cursorRect: cursorRect ? {
          x: cursorRect.x,
          y: cursorRect.y,
          width: cursorRect.width,
          height: cursorRect.height
        } : null,
        activeButtonRect: activeButtonRect ? {
          x: activeButtonRect.x,
          y: activeButtonRect.y,
          width: activeButtonRect.width,
          height: activeButtonRect.height
        } : null
      };
    })()
  `,
  returnByValue: true,
});

const resultState = state.result.value;
const resultInitialState = initialState.result.value;

if (resultInitialState.canvasCount < 1 || !resultInitialState.hasVisibleCanvas) {
  throw new Error(`Shader canvas did not render before hover. ${JSON.stringify(resultInitialState)}`);
}

if (!String(resultState.shellClass ?? "").includes("is-playing")) {
  throw new Error(`Shader replay did not enter playing state. ${JSON.stringify(resultState)}`);
}

if (resultState.canvasCount < 1 || !resultState.webgl) {
  throw new Error(`Shader WebGL canvas is unavailable. ${JSON.stringify(resultState)}`);
}

if (resultState.cursorRect && resultState.activeButtonRect) {
  const cursorHotX = resultState.cursorRect.x;
  const cursorHotY = resultState.cursorRect.y;
  const button = resultState.activeButtonRect;
  const cursorHitsActiveButton = (
    cursorHotX >= button.x - 8
    && cursorHotX <= button.x + button.width + 8
    && cursorHotY >= button.y - 8
    && cursorHotY <= button.y + button.height + 14
  );
  if (!cursorHitsActiveButton) {
    throw new Error(`Shader cursor is not aligned with the active item. ${JSON.stringify({
      cursorRect: resultState.cursorRect,
      activeButtonRect: resultState.activeButtonRect,
    })}`);
  }
}

const demoCount = await cdp<CdpEvaluateResult<DemoCountState>>("Runtime.evaluate", {
  expression: `
    (() => {
      const status = [...document.querySelectorAll('.shader-demo-status span')]
        .map((item) => item.textContent?.trim() ?? '');
      const buttons = document.querySelectorAll('.shader-demo-tree-scroll button').length;
      return { status, buttons };
    })()
  `,
  returnByValue: true,
});

const demoCountState = demoCount.result.value;
if (!demoCountState.status.includes("17 demos") || demoCountState.buttons !== 17) {
  throw new Error(`Shader demo list is incomplete. ${JSON.stringify(demoCountState)}`);
}

const screenshot = await cdp<{ data: string }>("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: false,
});
await writeFile(SCREENSHOT_PATH, Buffer.from(screenshot.data, "base64"));
ws.close();

console.log(JSON.stringify({
  rect,
  initialState: resultInitialState,
  state: resultState,
  demoCount: demoCountState,
  consoleEntries,
  screenshot: SCREENSHOT_PATH,
}, null, 2));
