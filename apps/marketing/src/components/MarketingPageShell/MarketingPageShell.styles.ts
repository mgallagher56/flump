import { css } from "@repo/ui/styled-system/css";

/**
 * The page: header, main and footer in one column on the canvas. Bubbles may run past a band's
 * edge (prototype 11), so the shell clips sideways overflow and the page never scrolls sideways.
 * When a page shows the section control (fixed at the bottom left), the footer gains room under
 * its last line, so the control never covers it (prototype 11; R5).
 */
export const shell = css({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "surface.canvas",
  overflowX: "clip",
  "&:has([data-stop-control]) footer": {
    // The control is 52px tall at 8 to 12px from the bottom: 72px clears it, as prototype 11.
    paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
  },
});
