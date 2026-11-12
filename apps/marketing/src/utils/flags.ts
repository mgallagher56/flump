/**
 * Owner-input placeholders (placeholder price card, placeholder company line) stay hidden until
 * the owner supplies real values. Set VITE_SHOW_PLACEHOLDERS=true at build time to preview them.
 * Build-time on purpose: the server and client bundles agree, so hydration cannot mismatch.
 */
export const showPlaceholders = (): boolean => import.meta.env.VITE_SHOW_PLACEHOLDERS === "true";
