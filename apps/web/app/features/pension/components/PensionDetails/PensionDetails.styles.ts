import { cva } from "@repo/ui/styled-system/css";

/** Saved facts: card surface and default border, never the dashed scenario treatment. */
export const detailsRoot = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
    padding: { base: "16px", md: "24px" },
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
  },
});

export const detailsHeader = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
});

export const detailsHeadingRow = cva({
  base: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" },
});

export const detailsTitle = cva({
  base: { margin: 0, textStyle: "heading.md", color: "text.primary" },
});

export const savedDate = cva({
  base: { textStyle: "body.sm", color: "text.muted", fontVariantNumeric: "tabular-nums" },
});

export const buttonRow = cva({
  base: { display: "flex", gap: "8px" },
});

export const mutedNote = cva({
  base: {
    margin: 0,
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const editGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
    gap: "12px",
    padding: "16px",
    borderRadius: "lg",
    backgroundColor: "surface.subtle",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
  },
});

export const checkStack = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: { base: "auto", sm: "1 / -1" },
  },
});

export const checkRow = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    textStyle: "body.md",
    color: "text.primary",
    minHeight: "44px",
    cursor: "pointer",
    "& input": { marginTop: "4px", width: "18px", height: "18px", accentColor: "primary.solid" },
    "&[data-disabled='true']": { color: "text.muted", cursor: "not-allowed" },
  },
});

export const checkHint = cva({
  base: { display: "block", textStyle: "body.sm", color: "text.muted" },
});

export const proportionBar = cva({
  base: {
    display: "block",
    height: "12px",
    width: "100%",
    borderRadius: "full",
    backgroundColor: "border.subtle",
    overflow: "hidden",
  },
});

export const employeeSegment = cva({ base: { fill: "chart.primary" } });
export const employerSegment = cva({ base: { fill: "chart.debt" } });

export const legendRow = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    textStyle: "body.md",
    fontVariantNumeric: "tabular-nums",
  },
});

export const legendGroup = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "8px 24px" },
});

export const legendItem = cva({
  base: { display: "flex", alignItems: "baseline", gap: "8px" },
});

export const dot = cva({
  base: {
    width: "10px",
    height: "10px",
    borderRadius: "full",
    display: "inline-block",
    flexShrink: 0,
  },
  variants: {
    series: {
      employee: { backgroundColor: "chart.primary" },
      employer: { backgroundColor: "chart.debt" },
    },
  },
});

export const assumedLabel = cva({
  base: { display: "block", textStyle: "body.sm", color: "text.muted", fontStyle: "italic" },
});

export const niNote = cva({
  base: { marginLeft: "4px", color: "status.positive.text" },
});
