import path from "node:path";
import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express, { type Express } from "express";
import { RouterContextProvider, type ServerBuild } from "react-router";
import { accessLog } from "./accessLog";
import { noSourceMaps } from "./noSourceMaps";
import { securityHeaders } from "./securityHeaders";
import { connectionCloseWhenDraining } from "./shutdown";

export interface CreateAppOptions {
  /** The built server module (`build/server/index.js`). */
  build: ServerBuild;
  mode: string;
  /** Directory holding `assets/` (the client build). Defaults to the build's own setting. */
  assetsBuildDirectory?: string;
  publicDir?: string;
  json?: boolean;
  logWrite?: (line: string) => void;
}

/**
 * A near-verbatim port of `react-router-serve` (7.18.5) with four additions: the security headers
 * on every response (including static files and responses React Router builds outside any hook),
 * a query-free access log (with the request id context) in place of morgan("tiny"), a 404 for
 * every `*.map` path, and `trust proxy` for the Railway hop.
 */
export function createApp({
  build,
  mode,
  assetsBuildDirectory = build.assetsBuildDirectory,
  publicDir = "public",
  json = mode === "production",
  logWrite,
}: CreateAppOptions): Express {
  const app = express();
  // Railway terminates TLS one hop in front.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(securityHeaders());
  app.use(accessLog({ json, write: logWrite }));
  app.use(connectionCloseWhenDraining());
  app.use(compression());
  app.use(noSourceMaps());

  const publicPath = build.publicPath ?? "/";
  // Same caching as react-router-serve: hashed assets immutable for a year, everything else 1h.
  app.use(
    path.posix.join(publicPath, "assets"),
    express.static(path.join(assetsBuildDirectory, "assets"), { immutable: true, maxAge: "1y" }),
  );
  app.use(publicPath, express.static(assetsBuildDirectory));
  app.use(express.static(publicDir, { maxAge: "1h" }));

  app.use(
    createRequestHandler({
      build,
      mode,
      // `future.v8_middleware` requires a RouterContextProvider. The root middleware reads and
      // writes nothing through Express, so it starts empty.
      getLoadContext: () => new RouterContextProvider(),
    }),
  );
  return app;
}
