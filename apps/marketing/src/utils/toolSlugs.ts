import { TOOL_SLUGS } from "@repo/ui/tools";
import { FEATURES, FEATURES_INDEX } from "./featureAreas";

/**
 * Every real page that is not a calculator. Pure data (no React) so the Express server can read it
 * for the sitemap, the 404 status and the analytics route keys. `/mcp` is not here: it answers 301
 * to the AI connection page (`server/redirects.ts`).
 */
export const STATIC_PATHS: readonly string[] = [
  "/",
  FEATURES_INDEX.path,
  ...FEATURES.map((feature) => feature.path),
  "/preview",
  "/tools",
  "/pricing",
  "/security",
  "/contact",
];

/**
 * Tool slugs, order and aliases come from the shared catalogue in `@repo/ui/tools`, which the
 * web app's `/tools` also reads, so the two sites cannot drift.
 */
export const CANONICAL_TOOL_SLUGS = TOOL_SLUGS;
export { isKnownToolSlug, TOOL_SLUG_ALIASES } from "@repo/ui/tools";
