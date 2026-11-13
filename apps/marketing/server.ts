import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { registerOps } from "./server/ops";
import { buildCsp, genericServerError, injectThemeNonce, resolveAppUrl } from "./server/security";
import { canonicalLinkTag } from "./server/sitemap";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";
  // Resolved once at boot. SSR reads it through getAppUrl() (process.env.VITE_APP_URL).
  const resolvedAppUrl = resolveAppUrl();
  process.env.VITE_APP_URL = resolvedAppUrl;

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    let nonce: string | undefined;
    if (isProd) {
      nonce = crypto.randomBytes(16).toString("base64");
      res.locals.nonce = nonce;
    }
    res.setHeader("Content-Security-Policy", buildCsp({ isProd, nonce }));

    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    next();
  });

  // Ops routes (/healthz, /robots.txt) and the noindex header come after the security headers
  // (so they get HSTS, nosniff etc.) but MUST stay before vite middlewares, sirv and the SPA
  // catch-all, or the catch-all serves HTML for them.
  registerOps(app);

  let vite: ViteDevServer | undefined;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares as any);
  } else {
    app.use((await import("compression")).default() as any);
    app.use(
      (await import("sirv")).default("dist/client", {
        extensions: [],
        // Keep /.well-known/* reachable (sirv hides dotfiles by default).
        dotfiles: true,
      }) as any,
    );
  }

  app.use(async (req, res) => {
    const url = req.originalUrl;

    try {
      let template: string;
      let render: (url: string) => { html: string; helmet: any; status?: number };
      if (!isProd && vite) {
        template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule("/src/entry-server.tsx")).render;
      } else {
        template = fs.readFileSync(path.resolve(__dirname, "dist/client/index.html"), "utf-8");
        // @ts-expect-error
        render = (await import("./dist/server/entry-server.js")).render;
      }

      const { html: appHtml, helmet, status } = render(url);

      const nonceAttr = res.locals.nonce ? ` nonce="${res.locals.nonce}"` : "";
      const appUrlScript = `<script${nonceAttr}>window.__FLUMP_APP_URL__=${JSON.stringify(resolvedAppUrl)};</script>`;

      const helmetMeta = `
        ${helmet?.title?.toString() || ""}
        ${helmet?.meta?.toString() || ""}
        ${helmet?.link?.toString() || ""}
        ${canonicalLinkTag(process.env.SITE_URL, url)}
        ${appUrlScript}
      `;

      // The inline theme script needs the CSP nonce in production.
      const html = injectThemeNonce(
        template.replace(`<!--app-html-->`, appHtml).replace(`<!--head-meta-->`, helmetMeta),
        nonceAttr,
      );

      res
        .status(status ?? 200)
        .set({ "Content-Type": "text/html" })
        .end(html);
    } catch (e: any) {
      try {
        !isProd && vite && vite.ssrFixStacktrace(e);
      } catch (traceError) {
        console.error("Failed to fix stacktrace:", traceError);
      }
      res.status(500).type("text/plain").end(genericServerError(e));
    }
  });

  const port = Number(process.env.PORT) || 3001; // Avoid port 3000 used by NestJS
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server started at http://0.0.0.0:${port}`);
  });
}

createServer();
