/**
 * Width at which the top navigation switches from the menu button and drawer to inline links.
 * Equal to Panda's `lg` breakpoint (64rem = 1024px). Both the marketing site and the web app take
 * the switch from here: in styles through the `navInline` / `navCollapsed` conditions declared in
 * `panda.preset.ts` (use them as `_navInline` / `_navCollapsed`), and in script through
 * `NAV_INLINE_MEDIA_QUERY`. Never hardcode the pixel value or pick another breakpoint for the nav.
 */
export const NAV_BREAKPOINT = "64rem";

/** Media query that matches when the inline top navigation is shown. */
export const NAV_INLINE_MEDIA_QUERY = `(min-width: ${NAV_BREAKPOINT})`;

/** Panda conditions for the nav switch; spread into the preset's `conditions.extend`. */
export const navConditions = {
  navInline: `@media screen and (min-width: ${NAV_BREAKPOINT})`,
  navCollapsed: `@media screen and (max-width: calc(${NAV_BREAKPOINT} - 0.02px))`,
} as const;
