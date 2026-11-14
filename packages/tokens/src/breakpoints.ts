/**
 * Width at which the top navigation switches from the menu button and drawer to inline links.
 * Equal to Panda's `md` breakpoint (48rem = 768px): phones get the menu button, the drawer and (in
 * the app) the bottom bar; tablets and up get the desktop navigation (owner ruling 2026-11-14).
 * Both the marketing site and the web app take the switch from here: in styles through the
 * `navInline` / `navCollapsed` conditions declared in `panda.preset.ts` (use them as `_navInline` /
 * `_navCollapsed`), and in script through `NAV_INLINE_MEDIA_QUERY`. Never hardcode the pixel value
 * or pick another breakpoint for the nav.
 */
export const NAV_BREAKPOINT = "48rem";

/**
 * Width from which the inline navigation has room for its full form (link icons, the three-way
 * theme switch). Between `NAV_BREAKPOINT` and this width (tablets) the inline navigation is compact
 * so it fits at 768px without wrapping. Equal to Panda's `lg` (64rem = 1024px). Use it through the
 * `navWide` condition (`_navWide`), never a raw `lg` in the header.
 */
export const NAV_WIDE_BREAKPOINT = "64rem";

/** Media query that matches when the inline top navigation is shown. */
export const NAV_INLINE_MEDIA_QUERY = `(min-width: ${NAV_BREAKPOINT})`;

/** Panda conditions for the nav switch; spread into the preset's `conditions.extend`. */
export const navConditions = {
  navInline: `@media screen and (min-width: ${NAV_BREAKPOINT})`,
  navCollapsed: `@media screen and (max-width: calc(${NAV_BREAKPOINT} - 0.02px))`,
  navWide: `@media screen and (min-width: ${NAV_WIDE_BREAKPOINT})`,
} as const;
