import http from "node:http";
import irohaAssistantHandler from "../api/iroha-assistant";
import natureLive2DDemoHandler from "../api/nature-live2d-demo";

const DEFAULT_PORT = 8787;
const MAX_BODY_BYTES = 80_000;

function json(res: http.ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function requestPath(req: http.IncomingMessage): string {
  const host = req.headers.host || "127.0.0.1";
  return new URL(req.url || "/", `http://${host}`).pathname;
}

const port = Number(process.env.IROP_ASSISTANT_PORT || DEFAULT_PORT);
const apiHandlers = {
  "/api/iroha-assistant": irohaAssistantHandler,
  "/api/nature-live2d-demo": natureLive2DDemoHandler,
};

const server = http.createServer((req, res) => {
  const path = requestPath(req);

  if (path === "/healthz") {
    json(res, 200, { ok: true, service: "irop-iroha-assistant" });
    return;
  }

  const handler = apiHandlers[path as keyof typeof apiHandlers];
  if (!handler) {
    json(res, 404, { error: "Not found" });
    return;
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    json(res, 413, { error: "Request body too large" });
    req.destroy();
    return;
  }

  void Promise.resolve(handler(req, res)).catch((error: unknown) => {
    if (res.headersSent) {
      res.end();
      return;
    }

    json(res, 500, {
      error: error instanceof Error ? error.message : "Assistant server error",
      runtime: "server-error",
      runtimeLabel: "SERVER ERROR",
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[irop-assistant] listening on http://127.0.0.1:${port}`);
});
