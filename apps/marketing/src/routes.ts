import { matchPath } from "react-router-dom";
import { isKnownToolSlug, STATIC_PATHS } from "./utils/toolSlugs";

/** Case-insensitive, like the router, so /Pricing renders the page and is not a 404. */
/** True when the URL maps to a real page. Everything else renders NotFoundPage with HTTP 404. */
export function isKnownPath(url: string): boolean {
  const pathname = (url.split(/[?#]/)[0] || "/").toLowerCase();
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if ((STATIC_PATHS as readonly string[]).includes(normalised)) return true;
  const tool = matchPath("/tools/:slug", normalised);
  return !!tool && isKnownToolSlug(tool.params.slug);
}

export function resolveStatus(url: string): 200 | 404 {
  return isKnownPath(url) ? 200 : 404;
}
