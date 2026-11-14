import { TOOL_SLUGS } from "@repo/ui/tools";

/** Pure data (no React) so the Express server can read it for the sitemap. */
export const STATIC_PATHS = ["/", "/tools", "/pricing", "/security", "/mcp", "/contact"] as const;

/**
 * Tool slugs, order and aliases come from the shared catalogue in `@repo/ui/tools`, which the
 * web app's `/tools` also reads, so the two sites cannot drift.
 */
export const CANONICAL_TOOL_SLUGS = TOOL_SLUGS;
export { isKnownToolSlug, TOOL_SLUG_ALIASES } from "@repo/ui/tools";
