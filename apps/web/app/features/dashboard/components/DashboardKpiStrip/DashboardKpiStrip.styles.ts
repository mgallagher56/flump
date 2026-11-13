import { cva } from "@repo/ui/styled-system/css";

export const kpiSubtext = cva({
  base: {
    textStyle: "body.sm",
    fontVariantNumeric: "tabular-nums",
    display: "inline-flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "4px",
  },
});

export const kpiSeparator = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
