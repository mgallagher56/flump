import { css } from "@repo/ui/styled-system/css";

export const figure = css({
  display: "inline-flex",
  alignItems: "baseline",
  gap: "6px",
  fontVariantNumeric: "tabular-nums",
});

export const perMonth = css({
  fontSize: "sm",
  fontWeight: "normal",
  color: "text.muted",
});

/** Matches `Money size="lg"` so a percentage reads at the same scale as the money cards. */
export const rateValue = css({
  textStyle: "numeric.lg",
  fontVariantNumeric: "tabular-nums",
});
