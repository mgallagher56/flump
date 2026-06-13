import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function createServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";
  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (isProd) {
      const nonce = crypto.randomBytes(16).toString("base64");
      res.locals.nonce = nonce;
      res.setHeader(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          `script-src 'self' 'nonce-${nonce}' https:`,
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data: https:",
          "connect-src 'self' https: ws:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      );
    } else {
      res.setHeader(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data: https:",
          "connect-src 'self' https: ws:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      );
    }
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  let vite;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use((await import("compression")).default());
    app.use(
      (await import("sirv")).default("dist/client", {
        extensions: [],
      }),
    );
  }
  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    try {
      let template;
      let render;
      if (!isProd && vite) {
        template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule("/src/entry-server.tsx")).render;
      } else {
        template = fs.readFileSync(path.resolve(__dirname, "dist/client/index.html"), "utf-8");
        // @ts-expect-error
        render = (await import("./dist/server/entry-server.js")).render;
      }
      const { html: appHtml, helmet } = render(url);
      const helmetMeta = `
        ${helmet?.title?.toString() || ""}
        ${helmet?.meta?.toString() || ""}
        ${helmet?.link?.toString() || ""}
      `;
      const html = template
        .replace(`<!--app-html-->`, appHtml)
        .replace(`<!--head-meta-->`, helmetMeta);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      console.error("Raw SSR Error:", e);
      try {
        !isProd && vite && vite.ssrFixStacktrace(e);
      } catch (traceError) {
        console.error("Failed to fix stacktrace:", traceError);
      }
      res.status(500).end(e.stack);
    }
  });
  const port = process.env.PORT || 3001; // Avoid port 3000 used by NestJS
  app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });
}
createServer();
