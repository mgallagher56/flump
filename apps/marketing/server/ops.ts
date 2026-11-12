import express, { type RequestHandler, type Router } from "express";
import { CANONICAL_TOOL_SLUGS, STATIC_PATHS } from "../src/utils/toolSlugs";
import { buildSecurityTxt, normaliseSecurityContact } from "./security";

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

/** Returns the origin from SITE_URL when it is a valid https URL, otherwise undefined. */
export function normaliseSiteUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export function buildSitemap(origin: string): string {
  const paths = [...STATIC_PATHS, ...CANONICAL_TOOL_SLUGS.map((s) => `/tools/${s}`)];
  const urls = paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** GET /healthz and GET /robots.txt. Must be mounted before static/SPA handlers. */
export function opsRouter(env: Env = process.env): Router {
  const router = express.Router();

  router.get("/healthz", (_req, res) => {
    res.status(200).set("Cache-Control", "no-store").json({ status: "ok" });
  });

  router.get("/robots.txt", (_req, res) => {
    const origin = normaliseSiteUrl(env.SITE_URL);
    const body = isIndexingAllowed(env)
      ? `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ""}`
      : "User-agent: *\nDisallow: /\n";
    res.status(200).type("text/plain").send(body);
  });

  // Only published when indexing is on and SITE_URL is a valid https URL. Otherwise a real 404:
  // the SPA catch-all would answer 404 with HTML anyway, but a plain-text 404 is cheaper for crawlers.
  router.get("/sitemap.xml", (_req, res) => {
    const origin = normaliseSiteUrl(env.SITE_URL);
    if (!isIndexingAllowed(env) || !origin) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }
    res.status(200).type("application/xml").send(buildSitemap(origin));
  });

  return router;
}

/**
 * GET /.well-known/security.txt, only when SECURITY_CONTACT is a valid email or https URL.
 * Otherwise it answers 404 itself: the SPA catch-all would serve HTML (200) for it.
 * Expiry is computed per request, so it never goes stale.
 */
export function securityTxtRouter(
  env: Env = process.env,
  now: () => Date = () => new Date(),
): Router {
  const router = express.Router();

  router.get("/.well-known/security.txt", (_req, res) => {
    const contact = normaliseSecurityContact(env.SECURITY_CONTACT);
    if (!contact) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }
    res.status(200).type("text/plain").send(buildSecurityTxt(contact, now()));
  });

  return router;
}

/** Wires the noindex header and ops routes onto an app; call before any other handler. */
export function registerOps(app: express.Express, env: Env = process.env): void {
  app.use(noindexMiddleware(env));
  app.use(opsRouter(env));
  app.use(securityTxtRouter(env));
}
