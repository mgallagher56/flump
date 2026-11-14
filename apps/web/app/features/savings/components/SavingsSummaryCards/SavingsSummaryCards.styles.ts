import { cva } from "@repo/ui/styled-system/css";

/** A non-money KPI value (a rate), tabular like every other figure. */
export const kpiFigure = cva({
  base: { fontVariantNumeric: "tabular-nums" },
});
