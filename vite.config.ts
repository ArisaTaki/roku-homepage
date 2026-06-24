import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type NextFunction = (error?: unknown) => void;

const apiRoutes = {
  "/api/iroha-assistant": () => import("./api/iroha-assistant"),
  "/api/nature-live2d-demo": () => import("./api/nature-live2d-demo"),
} satisfies Record<string, () => Promise<{ default: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }>>;

function localApiPlugin(): Plugin {
  const routePaths = new Set(Object.keys(apiRoutes));

  function handle(req: IncomingMessage, res: ServerResponse, next: NextFunction): void {
    const requestPath = req.url?.split("?")[0];
    if (!requestPath || !routePaths.has(requestPath)) {
      next();
      return;
    }

    void apiRoutes[requestPath as keyof typeof apiRoutes]().then(({ default: handler }) => {
      void handler(req, res);
    }).catch((error: unknown) => {
      console.error("[local-api]", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify({
        error: error instanceof Error ? error.message : "Local API error",
        runtime: "server-error",
        runtimeLabel: "SERVER ERROR",
      }));
    });
  }

  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), localApiPlugin()],
  };
});
