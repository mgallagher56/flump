import { css } from "@repo/ui/styled-system/css";

export const figureText = css({ fontVariantNumeric: "tabular-nums" });

/** The single "Not set" action under a card or the hero: a plain text link. */
export const promptLink = css({
  appearance: "none",
  background: "none",
  border: "none",
  p: "0",
  cursor: "pointer",
  color: "primary",
  textDecoration: "underline",
  fontWeight: "medium",
  textStyle: "body.sm",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});
