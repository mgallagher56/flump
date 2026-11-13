import type { RequestHandler } from "express";
import { canonicalPath } from "./sitemap";

type Env = Record<string, string | undefined>;

export interface PageviewLine {
  type: "pageview";
  key: string;
  ref: string | null;
  day: string;
}

/**
 * Cookieless page counts (E24-T9). Enabled only when BOTH ANALYTICS_MODE is exactly "log" and
 * ANALYTICS_NOTICE_URL is a valid https URL (the published cookie and storage statement).
 */
export function isAnalyticsEnabled(env: Env): boolean {
  if (env.ANALYTICS_MODE !== "log") return false;
  const raw = env.ANALYTICS_NOTICE_URL?.trim();
  if (!raw) return false;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|uptime|headless|lighthouse|curl|wget|python-requests|httpclient|go-http|node-fetch|axios|java\//i;

/** Missing or empty user agents are dropped too. The user agent itself is never logged. */
export const isBot = (userAgent: string | undefined): boolean =>
  !userAgent || BOT_PATTERN.test(userAgent);

/** An allow-listed route key (`/`, `/pricing`, `/tools/<known-slug>`, ...), otherwise `other`. */
export const routeKey = (requestUrl: string): string => canonicalPath(requestUrl) ?? "other";

/** Referrer host only (no path, query, port or credentials); null when absent, invalid or internal. */
export function referrerHost(referer: string | undefined, ownHost?: string): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (!host) return null;
    if (ownHost && host === ownHost.split(":")[0]?.toLowerCase()) return null;
    return host;
  } catch {
    return null;
  }
}

const wantsHtml = (accept: string | undefined): boolean => !!accept && accept.includes("text/html");

/**
 * Mount after static assets and before the SSR catch-all. Counts GET HTML navigations only and
 * emits one JSON line per page view. Never sets a cookie and never logs an IP or user agent.
 */
export function analyticsMiddleware(
  env: Env = process.env,
  sink: (line: string) => void = (line) => console.log(line),
  now: () => Date = () => new Date(),
): RequestHandler {
  if (!isAnalyticsEnabled(env)) return (_req, _res, next) => next();
  return (req, res, next) => {
    if (
      req.method === "GET" &&
      wantsHtml(req.headers.accept) &&
      !isBot(req.headers["user-agent"])
    ) {
      const entry: PageviewLine = {
        type: "pageview",
        key: routeKey(req.originalUrl),
        ref: referrerHost(req.headers.referer, req.headers.host),
        day: now().toISOString().slice(0, 10),
      };
      res.on("finish", () => {
        if (res.statusCode < 400) sink(JSON.stringify(entry));
      });
    }
    next();
  };
}

/** Boot warning when the gate is half-set, so a half-configured flag is not silent. */
export function analyticsFlagWarning(env: Env): string | undefined {
  if (isAnalyticsEnabled(env)) return undefined;
  if (!env.ANALYTICS_MODE && !env.ANALYTICS_NOTICE_URL) return undefined;
  return `[ops] Analytics stays OFF: it needs ANALYTICS_MODE exactly "log" AND ANALYTICS_NOTICE_URL set to the published https cookie and storage statement.`;
}
