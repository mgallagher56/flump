import express, { type RequestHandler, type Router } from "express";

type Env = Record<string, string | undefined>;

const isIndexingAllowed = (env: Env) => env.ALLOW_INDEXING === "true";

/** Sets X-Robots-Tag: noindex, nofollow on every response unless ALLOW_INDEXING is exactly "true". */
export function noindexMiddleware(env: Env = process.env): RequestHandler {
  return (_req, res, next) => {
    if (!isIndexingAllowed(env)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    next();
  };
}

/** GET /healthz and GET /robots.txt. Must be mounted before static/SPA handlers. */
export function opsRouter(env: Env = process.env): Router {
  const router = express.Router();

  router.get("/healthz", (_req, res) => {
    res.status(200).set("Cache-Control", "no-store").json({ status: "ok" });
  });

  router.get("/robots.txt", (_req, res) => {
    const body = isIndexingAllowed(env)
      ? "User-agent: *\nAllow: /\n"
      : "User-agent: *\nDisallow: /\n";
    res.status(200).type("text/plain").send(body);
  });

  return router;
}

/** Wires the noindex header and ops routes onto an app; call before any other handler. */
export function registerOps(app: express.Express, env: Env = process.env): void {
  app.use(noindexMiddleware(env));
  app.use(opsRouter(env));
}
