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

export const summaryStack = css({ display: "flex", flexDirection: "column", gap: "4" });
