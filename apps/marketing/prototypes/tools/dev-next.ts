/**
 * A second dev server for building new prototypes without touching one already being shown.
 * Same SSR as server.ts in development, with its own dependency cache, so it can run beside the
 * normal dev server without disturbing it. Point the alias at another index to try routes in
 * progress without the normal server importing them.
 *
 *   PORT=3015 bun prototypes/tools/dev-next.ts      (from apps/marketing)
 */
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { buildHeadMeta, splitHoistables } from "../../server/headMeta";
import { injectThemeNonce } from "../../server/security";

const root = path.resolve(import.meta.dir, "../..");
const port = Number(process.env.PORT) || 3015;

const vite = await createViteServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  // Its own dependency cache, so it never invalidates the one the other dev server is using.
  cacheDir: path.join(root, "node_modules/.vite-next"),
  resolve: {
    alias: {
      "@flump/marketing-prototypes": path.join(root, "prototypes/index.tsx"),
    },
  },
  server: { middlewareMode: true, hmr: { port: port + 100 } },
  appType: "custom",
});

const app = express();
app.use(vite.middlewares);
app.use(async (req, res) => {
  const url = req.originalUrl;
  try {
    let template = fs.readFileSync(path.join(root, "index.html"), "utf-8");
    template = await vite.transformIndexHtml(url, template);
    const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
    const { html: renderedHtml, helmet, status } = render(url);
    const { hoisted, rest } = splitHoistables(renderedHtml);
    const head = buildHeadMeta({ hoisted, helmet, appUrlScript: "", url, status: status ?? 200 });
    const html = injectThemeNonce(
      template.replace("<!--app-html-->", rest).replace("<!--head-meta-->", head),
      "",
    );
    res
      .status(status ?? 200)
      .set({ "Content-Type": "text/html" })
      .end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error as Error);
    console.error(error);
    res
      .status(500)
      .type("text/plain")
      .end(String((error as Error).stack ?? error));
  }
});

app.listen(port, "0.0.0.0", () => console.log(`Prototype dev server at http://localhost:${port}`));
