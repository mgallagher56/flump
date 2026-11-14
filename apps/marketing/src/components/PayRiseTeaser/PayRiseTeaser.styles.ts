import { cva } from "@repo/ui/styled-system/css";

export const teaserCard = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(12, minmax(0, 1fr))" },
    gap: { base: "6", md: "8" },
    alignItems: "start",
  },
});

export const teaserControls = cva({
  base: {
    gridColumn: { base: "auto", md: "span 5" },
    display: "flex",
    flexDirection: "column",
    gap: "6",
  },
});

export const teaserOutcome = cva({
  base: {
    gridColumn: { base: "auto", md: "span 7" },
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const outcomeLabel = cva({
  base: { textStyle: "label.md", color: "text.secondary" },
});

export const outcomeHeadline = cva({
  base: {
    textStyle: "numeric.kpi",
    color: "text.primary",
    margin: "0",
    fontVariantNumeric: "tabular-nums",
  },
});

export const breakdownList = cva({
  base: { display: "flex", flexDirection: "column", margin: "0" },
});

export const breakdownRow = cva({
  base: {
    display: "flex",
    justifyContent: "space-between",
    gap: "4",
    paddingY: "2",
    textStyle: "body.sm",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
  },
});

export const breakdownTerm = cva({
  base: { color: "text.secondary" },
});

export const breakdownValue = cva({
  base: {
    margin: "0",
    fontWeight: "semibold",
    color: "text.primary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const taperNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: "0" },
});

export const teaserActions = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3" },
});

export const taperFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});

export const assumptionsText = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0, mt: "6" },
});
