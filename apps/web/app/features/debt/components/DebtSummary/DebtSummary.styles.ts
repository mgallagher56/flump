import { css } from "@repo/ui/styled-system/css";

// KpiCard sets tabular-nums on its values; the stack sets it too so every figure here aligns.
export const summaryStack = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  fontVariantNumeric: "tabular-nums",
});
