import { cva } from "@repo/ui/styled-system/css";

export const housingCard = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    p: { base: "16px", md: "20px" },
    borderRadius: "lg",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    backgroundColor: "surface.card",
    boxShadow: "card",
    minWidth: 0,
  },
});

export const housingFigures = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: "16px",
    margin: 0,
  },
});

export const housingFigure = cva({
  base: { display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 },
});

export const housingLabel = cva({
  base: { textStyle: "label.sm", color: "text.secondary", margin: 0 },
});

export const housingValue = cva({
  base: {
    textStyle: "numeric.lg",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

/** The share is a plain fact: neutral text, never a status colour or a benchmark. */
export const housingShare = cva({
  base: {
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const housingNote = cva({
  base: { textStyle: "body.sm", color: "text.muted", margin: 0 },
});

export const housingUnknown = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const housingFixEnd = cva({
  base: {
    textStyle: "body.sm",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  },
});

export const rentForm = cva({
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "12px",
    "& > :first-child": { flex: "1 1 200px", minWidth: 0 },
  },
});

export const rentError = cva({
  base: { textStyle: "body.sm", color: "status.danger.text", margin: 0 },
});
