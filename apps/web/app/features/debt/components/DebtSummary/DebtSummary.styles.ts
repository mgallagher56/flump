import { css } from "@repo/ui/styled-system/css";

// KpiCard sets tabular-nums on its values; the stack sets it too so every figure here aligns.
export const summaryStack = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  fontVariantNumeric: "tabular-nums",
});

/** The one quiet line under the strip when a rate after a 0% deal is assumed. */
export const assumptionLine = css({
  margin: 0,
  fontSize: "sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});
