import { cva } from "@repo/ui/styled-system/css";

export const root = cva({
  // The page section gap (as PageBody and the take-home page), not a tighter one.
  base: { display: "flex", flexDirection: "column", gap: "page.section", minWidth: 0 },
});

/** Sized with KpiCard's `kpiMoney`, so the date matches the bill beside it; it wraps between words. */
export const date = cva({
  base: { display: "block", fontVariantNumeric: "tabular-nums", overflowWrap: "normal" },
});
