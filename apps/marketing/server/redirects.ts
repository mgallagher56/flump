import type { RequestHandler } from "express";
import { AI_CONNECTION } from "../src/utils/featureAreas";

/**
 * Old marketing addresses and where they now live (E42). Keys are normalised paths (lower case, no
 * trailing slash). Every target is a fixed path from this table, never built from the request, so
 * the redirect cannot be pointed at another site.
 */
const REDIRECTS: Readonly<Record<string, string>> = {
  "/mcp": AI_CONNECTION.path,
};

/**
 * The page an old address moved to, or undefined when the path is not an old address. Matched
 * without regard to case, percent-encoding, repeated slashes or a trailing slash, like the router.
 * The query and fragment are ignored here; the middleware keeps the query.
 */
export function redirectTarget(requestUrl: string): string | undefined {
  let raw = requestUrl.split(/[?#]/)[0] || "/";
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  const lower = raw.toLowerCase().replace(/\/{2,}/g, "/");
  const path = lower.length > 1 ? lower.replace(/\/+$/, "") || "/" : lower;
  return Object.hasOwn(REDIRECTS, path) ? REDIRECTS[path] : undefined;
}

/**
 * 301 from an old address to its new page, keeping the query string. GET and HEAD only; any other
 * method falls through to the 404 page. Mounted in `server.ts` after the security headers and
 * `registerOps` (so each 301 still carries HSTS and the other headers) and before analytics and SSR.
 */
export function redirectMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const target = redirectTarget(req.originalUrl);
    if (!target) return next();
    const queryAt = req.originalUrl.indexOf("?");
    const query = queryAt === -1 ? "" : req.originalUrl.slice(queryAt).split("#")[0];
    res.redirect(301, `${target}${query}`);
  };
}
