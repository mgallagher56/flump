import { cva } from "@repo/ui/styled-system/css";

export const summaryCard = cva({
  base: {
    backgroundColor: "surface.card",
    borderRadius: "xl",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "card",
    p: { base: "16px", md: "20px" },
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: 0,
  },
});

export const summaryHeader = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "12px",
  },
});

export const summaryTitleRow = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const summaryTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const summaryDescription = cva({
  base: { textStyle: "body.sm", color: "text.muted", marginTop: "2px", maxWidth: "60ch" },
});

export const summaryActions = cva({
  base: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
});

export const saveMessage = cva({
  base: {
    textStyle: "label.sm",
    color: "status.positive.text",
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
});

export const saveError = cva({
  base: { textStyle: "label.sm", color: "status.danger.text", margin: 0 },
});

export const termValue = cva({
  base: { textStyle: "numeric.lg", color: "text.primary", fontVariantNumeric: "tabular-nums" },
});

export const editGrid = cva({
  base: {
    display: "grid",
    gridTemplateColumns: {
      base: "minmax(0, 1fr)",
      sm: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(4, minmax(0, 1fr))",
    },
    gap: "14px",
    alignItems: "start",
    "& > *": { minWidth: 0 },
  },
});

export const typeFieldset = cva({
  base: {
    border: "none",
    margin: 0,
    padding: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
});

export const typeLegend = cva({
  base: { textStyle: "label.md", color: "text.secondary", padding: 0 },
});

export const typeButtons = cva({
  base: { display: "flex", gap: "8px", flexWrap: "wrap" },
});

export const estimateRow = cva({
  base: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    flexWrap: "wrap",
    textStyle: "body.sm",
    color: "text.muted",
    fontVariantNumeric: "tabular-nums",
  },
});

export const savedLine = cva({
  base: {
    textStyle: "label.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    margin: 0,
    marginTop: "8px",
  },
});

export const unsavedNote = cva({
  base: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "8px",
    textStyle: "body.sm",
    color: "text.secondary",
    "& p": { margin: 0 },
  },
});
