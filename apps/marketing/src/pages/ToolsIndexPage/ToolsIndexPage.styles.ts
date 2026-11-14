import { css } from "@repo/ui/styled-system/css";

export const pageStyle = css({ minHeight: "100vh", display: "flex", flexDirection: "column" });

export const mainStyle = css({ flex: "1" });

export const containerStyle = css({ maxWidth: "6xl", mx: "auto", py: "12", px: "4" });

export const toolListStyle = css({ listStyle: "none", padding: "0", margin: "0" });

export const toolItemStyle = css({ display: "flex", "& > a": { flex: "1" } });

export const toolCardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  backgroundColor: "surface.card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "card",
  p: "6",
  textDecoration: "none",
  color: "inherit",
  boxShadow: "card",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "base",
  transitionTimingFunction: "standard",
  _hover: { borderColor: "primary", boxShadow: "cardHover" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

/** One wrap rule for card titles in both apps: balanced lines. */
export const toolTitleStyle = css({ textWrap: "balance" });

export const ctaLinkStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  color: "primary",
  textStyle: "label.md",
  marginTop: "auto",
  paddingTop: "2",
});
