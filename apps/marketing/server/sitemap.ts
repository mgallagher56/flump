import express, { type Router } from "express";
import { CANONICAL_TOOL_SLUGS, STATIC_PATHS } from "../src/utils/toolSlugs";

type Env = Record<string, string | undefined>;

/**
 * Indexing is deliberate: it needs BOTH ALLOW_INDEXING and FLUMP_LAUNCH set to exactly "true"
 * (E24-T6). Either alone stays noindex.
 */
export const isIndexingAllowed = (env: Env): boolean =>
  env.ALLOW_INDEXING === "true" && env.FLUMP_LAUNCH === "true";

/** Returns a warning message when exactly one of the two indexing flags is set, else undefined. */
export function indexingFlagWarning(env: Env): string | undefined {
  const allow = env.ALLOW_INDEXING === "true";
  const launch = env.FLUMP_LAUNCH === "true";
  if (allow === launch) return undefined;
  const set = allow ? "ALLOW_INDEXING" : "FLUMP_LAUNCH";
  const missing = allow ? "FLUMP_LAUNCH" : "ALLOW_INDEXING";
  return `[ops] Indexing stays OFF: ${set} is set but ${missing} is not. Both must be exactly "true" to allow indexing.`;
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

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * `<link rel="canonical">` for a request URL, query and hash stripped. Returns "" when SITE_URL
 * is not a valid https origin (canonicals were removed until a domain exists).
 */
export function canonicalLinkTag(siteUrl: string | undefined, requestUrl: string): string {
  const origin = normaliseSiteUrl(siteUrl);
  if (!origin) return "";
  let pathname = "/";
  try {
    pathname = new URL(requestUrl, "http://localhost").pathname;
  } catch {
    // fall back to the root
  }
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "") || "/";
  return `<link rel="canonical" href="${escapeAttr(origin + pathname)}" />`;
}

/** GET /sitemap.xml: real 404 unless indexing is allowed and SITE_URL is a valid https origin. */
export function sitemapRouter(env: Env = process.env): Router {
  const router = express.Router();
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
