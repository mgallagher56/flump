import { cva } from "@repo/ui/styled-system/css";

export const controlsPanel = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    minWidth: 0,
    padding: { base: "16px", md: "20px" },
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const controlsHeading = cva({
  base: { margin: 0, textStyle: "heading.sm", color: "text.primary" },
});

export const controlsHint = cva({
  base: { margin: "4px 0 0", textStyle: "body.sm", color: "text.muted" },
});

export const presetGroup = cva({
  base: { display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, border: 0 },
});

export const presetLegend = cva({
  base: { padding: 0, textStyle: "label.md", color: "text.secondary" },
});

export const presetRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "6px" },
});

export const realRateNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});
