import { cva } from "@repo/ui/styled-system/css";

/**
 * Signed-in app footer spacing: aligns the inner column with the 1536px header/page shell and
 * reserves space below the nav breakpoint for the fixed `MobileBottomBar`.
 */
export const appFooterSpacing = cva({
  base: {
    marginTop: { base: "8", md: "12" },
    paddingBottom: {
      base: "calc(token(spacing.10) + var(--app-bottom-bar-offset, 0px) + env(safe-area-inset-bottom, 0px))",
      _navInline: "token(spacing.10)",
    },
    "& > div": {
      maxWidth: "1536px",
      paddingInline: { base: "0", _navInline: "4" },
    },
    "& nav h3": {
      marginBottom: "3",
    },
  },
});
