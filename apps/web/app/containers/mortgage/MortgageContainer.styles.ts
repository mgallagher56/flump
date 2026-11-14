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

/** The partial state: up to two plain figures and one prompt, on the page surface (no card). */
export const promptBlock = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "12px",
    minWidth: 0,
    maxWidth: "70ch",
  },
});

export const plainFigures = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px 40px",
    margin: 0,
    marginBottom: "8px",
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
    textStyle: "numeric.md",
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
