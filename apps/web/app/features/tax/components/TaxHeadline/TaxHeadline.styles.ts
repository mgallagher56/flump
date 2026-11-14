import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", minWidth: 0 },
});

/** Sized with KpiCard's `kpiMoney`, so the date matches the bill beside it; it wraps between words. */
export const date = cva({
  base: { display: "block", fontVariantNumeric: "tabular-nums", overflowWrap: "normal" },
});
