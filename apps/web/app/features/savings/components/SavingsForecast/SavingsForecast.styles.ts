import { cva } from "@repo/ui/styled-system/css";

export const forecastControls = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

export const forecastContent = cva({
  base: { display: "flex", flexDirection: "column", gap: "6", minWidth: 0 },
});

/** One outcome figure plus at most 2 supporting (P1.7), plain text on the zone surface. */
export const outcome = cva({ base: { display: "flex", flexDirection: "column", gap: "1" } });

export const outcomeLabel = cva({
  base: { margin: "0", textStyle: "body.sm", color: "text.secondary" },
});

export const outcomeValue = cva({
  base: {
    margin: "0",
    textStyle: "numeric.kpi",
    fontVariantNumeric: "tabular-nums",
    color: "text.primary",
  },
});

export const outcomeSupport = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "6", margin: "0", mt: "2" },
});

export const outcomeSupportItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5",
    textStyle: "body.sm",
    color: "text.secondary",
    "& dd": {
      margin: "0",
      textStyle: "body.md",
      color: "text.primary",
      fontVariantNumeric: "tabular-nums",
    },
  },
});

export const goalLine = cva({
  base: {
    margin: "0",
    mt: "2",
    textStyle: "body.sm",
    color: "text.secondary",
    fontVariantNumeric: "tabular-nums",
  },
});

export const chartWrap = cva({
  base: { width: "100%", height: "240px", minWidth: 0, fontSize: "xs" },
});

export const moreOptions = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", pt: "2" },
});
