import { cva } from "@repo/ui/styled-system/css";

/** Added to `PageBody`, which owns the width, gutters and the gap between sections. */
export const pageRoot = cva({
  base: {
    paddingBottom: "48px",
    fontVariantNumeric: "tabular-nums",
    minWidth: 0,
    width: "100%",
  },
});

/** Hero and strip: the saved headline figures, kept together. */
export const savedSection = cva({
  base: { display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 },
});

/**
 * Partial state: the header and the prompt sit together, so the page's section gap does not open a
 * hole between the h1 and the figures (PageHeader already brings its own bottom margin).
 */
export const partialStack = cva({
  base: { display: "flex", flexDirection: "column", minWidth: 0 },
});

/**
 * The partial state: up to two saved figures and one prompt, grouped in one card (common region)
 * so the figures read as the user's mortgage and the prompt as the one next step.
 */
export const promptBlock = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "16px",
    minWidth: 0,
    maxWidth: "720px",
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    boxShadow: "card",
    p: { base: "20px", md: "24px" },
  },
});

/** Separates the saved figures from the prompt inside the partial-state card. */
export const promptDivider = cva({
  base: {
    alignSelf: "stretch",
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border",
    pt: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
  },
});

export const plainFigures = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px 40px",
    margin: 0,
  },
});

export const plainFigure = cva({
  base: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
});

export const plainFigureLabel = cva({
  base: { textStyle: "label.sm", color: "text.muted" },
});

export const plainFigureValue = cva({
  base: {
    margin: 0,
    textStyle: "numeric.lg",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const promptTitle = cva({
  base: { textStyle: "heading.sm", color: "text.primary", margin: 0 },
});

export const promptText = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const promptStatus = cva({
  base: { textStyle: "label.sm", color: "text.secondary", margin: 0 },
});

export const tabPanel = cva({
  base: { display: "flex", flexDirection: "column", gap: "20px", minWidth: 0, paddingTop: "16px" },
});
