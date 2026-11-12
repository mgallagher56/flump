export const NOINDEX_VALUE = "noindex, nofollow";

type Env = Record<string, string | undefined>;

/** Indexing is only allowed when ALLOW_INDEXING is exactly "true". */
export function isIndexingAllowed(env: Env = process.env): boolean {
  return env.ALLOW_INDEXING === "true";
}

/** Sets X-Robots-Tag: noindex, nofollow unless indexing is explicitly allowed. */
export function applyRobotsHeader(headers: Headers, env: Env = process.env): Headers {
  if (!isIndexingAllowed(env)) {
    headers.set("X-Robots-Tag", NOINDEX_VALUE);
  }
  return headers;
}

/** robots.txt body: Allow only when ALLOW_INDEXING is exactly "true" (same rule as marketing). */
export function robotsTxt(env: Env = process.env): string {
  return isIndexingAllowed(env) ? "User-agent: *\nAllow: /\n" : "User-agent: *\nDisallow: /\n";
}
