import { FEATURES, FEATURES_INDEX } from "./featureAreas";

/**
 * Every real page. Pure data (no React) so the Express server can read it for the sitemap, the 404
 * status and the analytics route keys. `/mcp`, `/tools` and the former calculator pages are not
 * here: they answer 301 (`server/redirects.ts`).
 */
export const STATIC_PATHS: readonly string[] = [
  "/",
  FEATURES_INDEX.path,
  ...FEATURES.map((feature) => feature.path),
  "/preview",
  "/pricing",
  "/security",
  "/contact",
];
