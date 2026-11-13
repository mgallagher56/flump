import express, { type Router } from "express";
import { CANONICAL_TOOL_SLUGS, STATIC_PATHS, TOOL_SLUG_ALIASES } from "../src/utils/toolSlugs";

type Env = Record<string, string | undefined>;

/**
 * Indexing is deliberate: it needs BOTH ALLOW_INDEXING and FLUMP_LAUNCH set to exactly "true"
 * (E24-T6). Either alone stays noindex.
 */
export const isIndexingAllowed = (env: Env): boolean =>
  env.ALLOW_INDEXING === "true" && env.FLUMP_LAUNCH === "true";

/**
 * Returns a warning when the two indexing flags disagree, or when either is set to something other
 * than exactly "true" (e.g. "1", "TRUE"), which silently stays noindex. Undefined when fine.
 */
export function indexingFlagWarning(env: Env): string | undefined {
  const flags = ["ALLOW_INDEXING", "FLUMP_LAUNCH"] as const;
  const bad = flags.filter((f) => env[f] !== undefined && env[f] !== "" && env[f] !== "true");
  if (bad.length > 0) {
    return `[ops] Indexing stays OFF: ${bad.join(" and ")} must be exactly "true" (got ${bad.map((f) => JSON.stringify(env[f])).join(", ")}).`;
  }
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
 * The canonical path for a request URL, or undefined when it is not a real page. Query, hash,
 * duplicate and trailing slashes, case and percent-encoding are normalised, and tool-slug aliases
 * map to their canonical slug. The result always comes from the known route list.
 */
export function canonicalPath(requestUrl: string): string | undefined {
  let raw = requestUrl.split(/[?#]/)[0] || "/";
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  const lower = raw.toLowerCase().replace(/\/{2,}/g, "/");
  const path = lower.length > 1 ? lower.replace(/\/+$/, "") || "/" : lower;
  if ((STATIC_PATHS as readonly string[]).includes(path)) return path;
  const match = /^\/tools\/([^/]+)$/.exec(path);
  const slug = match?.[1];
  if (!slug) return undefined;
  if ((CANONICAL_TOOL_SLUGS as readonly string[]).includes(slug)) return path;
  const target = Object.hasOwn(TOOL_SLUG_ALIASES, slug) ? TOOL_SLUG_ALIASES[slug] : undefined;
  return target ? `/tools/${target}` : undefined;
}

/**
 * `<link rel="canonical">` for a request URL. Returns "" when SITE_URL is not a valid https origin
 * (canonicals were removed until a domain exists) or the URL is not a real page (404s).
 */
export function canonicalLinkTag(siteUrl: string | undefined, requestUrl: string): string {
  const origin = normaliseSiteUrl(siteUrl);
  const path = canonicalPath(requestUrl);
  if (!origin || !path) return "";
  return `<link rel="canonical" href="${escapeAttr(origin + path)}" />`;
}

/** `<meta property="og:url">` for a request URL; same rules as the canonical (needs SITE_URL, real page). */
export function ogUrlTag(siteUrl: string | undefined, requestUrl: string): string {
  const origin = normaliseSiteUrl(siteUrl);
  const path = canonicalPath(requestUrl);
  if (!origin || !path) return "";
  return `<meta property="og:url" content="${escapeAttr(origin + path)}" />`;
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
