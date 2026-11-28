import { css } from "@repo/ui/styled-system/css";

/** One quiet line under a close's button: secondary text, smaller than the line above it. */
export const line = css({
  margin: 0,
  textStyle: "body.sm",
  color: "text.secondary",
});

// Links are teal in light and mint in dark (Midnight and Mint), as on the contact page.
export const link = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
});
