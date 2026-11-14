import { cva } from "@repo/ui/styled-system/css";

export const barRoot = cva({
  base: {
    // Sticky only from md up: on phones the bar would otherwise cover a third of the screen.
    position: { base: "static", md: "sticky" },
    top: 0,
    zIndex: 40,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: { base: "8px 12px", md: "10px 16px" },
    backgroundColor: "surface.card",
    color: "text.primary",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "card",
  },
});

export const barGroup = cva({
  base: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px", minWidth: 0 },
});

export const barTitle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    textStyle: "label.md",
    color: "text.primary",
  },
});

/** The small button size keeps the chip compact; the 44px minimum keeps the hit area (WCAG 2.5.8). */
export const barButton = cva({ base: { minHeight: "44px" } });

export const barHint = cva({
  base: { textStyle: "body.sm", color: "text.secondary", display: { base: "none", md: "inline" } },
});

/**
 * The household tabs. They grow into the space between the title and the sign-up group, and wrap
 * to a full row of their own when that space is under 20rem. Inside, the tabs wrap onto a second
 * row rather than scroll, and a long label wraps inside its tab, so all three stay readable at 375
 * and 320 with nothing clipped (no-truncation rule). The shared Tabs scroller is left to scroll
 * elsewhere; only this bar opts out of it.
 */
export const personaTabs = cva({
  base: {
    flex: "1 1 20rem",
    minWidth: 0,
    maxWidth: "100%",
    "& [data-tabs-scroller]": { overflowX: "visible", contain: "none", maskImage: "none" },
    "& [role=tablist]": { display: "flex", flexWrap: "wrap", maxWidth: "100%" },
    // A tab never grows past its row: a long label wraps inside it instead of overflowing.
    "& [role=tab]": { whiteSpace: "normal", textAlign: "center", minWidth: 0, maxWidth: "100%" },
  },
});

/** Page column for the sandbox route: the bar, the dashboard, then the closing sign-up. */
export const sandboxPage = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: { base: "12px", md: "24px" },
    paddingTop: { base: "8px", md: "16px" },
    paddingBottom: "48px",
    width: "100%",
    maxWidth: "1536px",
    margin: "0 auto",
  },
});

/** The closing sign-up at the foot of the sandbox page. */
export const sandboxEnd = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    paddingX: { base: "16px", md: "24px" },
    paddingY: "20px",
    backgroundColor: "surface.card",
    borderRadius: "card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
  },
});

export const sandboxEndText = cva({
  base: { margin: 0, textStyle: "body.md", color: "text.primary" },
});
