import { css } from "@repo/ui/styled-system/css";

/** The £100,000 line: plain body text on the canvas, no fill, icon or heading (ruling 6). */
export const trapLine = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  maxWidth: "70ch",
});

export const trapText = css({
  margin: 0,
  textStyle: "body.md",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

export const mutedNote = css({
  margin: 0,
  textStyle: "body.sm",
  color: "text.secondary",
});
