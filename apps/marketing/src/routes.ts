import { STATIC_PATHS } from "./utils/toolSlugs";

/**
 * True when the URL maps to a real page. Everything else renders NotFoundPage with HTTP 404.
 * Case-insensitive, like the router, so /Pricing renders the page and is not a 404.
 */
export function isKnownPath(url: string): boolean {
  const pathname = (url.split(/[?#]/)[0] || "/").toLowerCase();
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return STATIC_PATHS.includes(normalised);
}

export function resolveStatus(url: string): 200 | 404 {
  return isKnownPath(url) ? 200 : 404;
}
