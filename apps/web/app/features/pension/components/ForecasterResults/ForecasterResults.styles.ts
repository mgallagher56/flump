import { cva } from "@repo/ui/styled-system/css";

export const outcome = cva({ base: { display: "flex", flexDirection: "column", gap: "1" } });

export const outcomeLabel = cva({
  base: { margin: 0, textStyle: "body.sm", color: "text.secondary" },
});

export const outcomeValue = cva({
  base: {
    margin: 0,
    textStyle: "numeric.kpi",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
});

export const outcomeSupport = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "6", margin: 0, mt: "2" },
});

export const outcomeSupportItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    textStyle: "body.sm",
    color: "text.secondary",
    "& dd": {
      margin: 0,
      textStyle: "body.md",
      color: "text.primary",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const allowanceNote = cva({
  base: {
    margin: 0,
    mt: "2",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});
