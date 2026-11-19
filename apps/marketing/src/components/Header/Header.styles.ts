import { cva } from "@repo/ui/styled-system/css";

/**
 * Sign in / CTA group in the top bar. Header.tsx adds `topBarOptionalAction`, so on a cramped bar
 * (a phone at large text) it goes; Sign in and the invite stay in the menu.
 */
export const headerAuth = cva({
  base: { display: "flex", alignItems: "center", gap: { base: "1", sm: "2" } },
});

/** Compact top-bar buttons: tighter padding and text on the smallest screens. */
export const headerButton = cva({
  base: {
    px: { base: "1.5", sm: "4" },
    fontSize: { base: "xs", sm: "sm" },
    textDecoration: "none",
  },
});

/** Label variants that swap at `sm` (full label from sm up, short label below). */
export const fullLabel = cva({ base: { display: { base: "none", sm: "inline" } } });
export const shortLabel = cva({
  base: {
    display: { base: "inline", sm: "none" },
    marginInline: "clamp(-8px, calc(100vw - 330px), 0px)",
  },
});

/** Drawer link: label left, helper text right. */
export const drawerLinkRow = cva({ base: { justifyContent: "space-between" } });

export const drawerLinkLabel = cva({
  base: { display: "inline-flex", alignItems: "center", gap: "1.5" },
});

/** One line at every width, so every row is the same height at 320px (P71). */
export const drawerLinkHint = cva({
  base: { textStyle: "label.sm", fontWeight: "normal", color: "text.muted", whiteSpace: "nowrap" },
});

/** Full-width CTAs at the bottom of the drawer. */
export const drawerCtas = cva({
  base: { display: "flex", flexDirection: "column", gap: "2.5" },
});

export const drawerCta = cva({ base: { width: "100%", textDecoration: "none" } });

/**
 * Swap at the shared `navWide` condition (`NAV_WIDE_BREAKPOINT`, 1024px), never a raw breakpoint:
 * the full header from there; on tablets and phones the lower-priority parts live in the menu.
 */
export const wideOnly = cva({ base: { display: "none", _navWide: { display: "inline-flex" } } });
export const belowWide = cva({ base: { _navWide: { display: "none" } } });
