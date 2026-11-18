import { cva } from "@repo/ui/styled-system/css";

/**
 * Signed-in app footer spacing. Below the nav breakpoint the fixed `MobileBottomBar` covers the
 * bottom of the page, so the footer's own padding reserves its height: the footer line ends just
 * above the bar, never under it, and adds no empty band above it.
 */
export const appFooterSpacing = cva({
  base: {
    marginTop: { base: "8", md: "12" },
    paddingInline: { base: "4", md: "6" },
    paddingBottom: {
      base: "calc(token(spacing.3) + var(--app-bottom-bar-offset, 0px) + env(safe-area-inset-bottom, 0px))",
      _navInline: "3",
    },
    "& > div": {
      maxWidth: "1536px",
      marginInline: "auto",
      paddingInline: { base: "0", _navInline: "4" },
    },
  },
});
