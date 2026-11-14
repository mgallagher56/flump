import { css } from "@repo/ui/styled-system/css";

export const pageStyle = css({ minHeight: "100vh", display: "flex", flexDirection: "column" });

export const mainStyle = css({ flex: "1" });

/** Same width and top spacing as the web `/tools` index (`SignedOutPage width="wide"`). */
export const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "4",
  pt: { base: "page.top.sm", lg: "page.top.lg" },
  pb: "12",
  px: { base: "page.gutter.sm", md: "page.gutter.md" },
});

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
  // The same padding as the web tile (`Card padding="lg"`), so both indexes line up.
  p: { base: "5", md: "7" },
  textDecoration: "none",
  color: "inherit",
  boxShadow: "card",
  transitionProperty: "border-color, box-shadow",
  transitionDuration: "base",
  transitionTimingFunction: "standard",
  _hover: { borderColor: "primary", boxShadow: "cardHover" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

/** One wrap rule for card titles in both apps: natural breaks, no orphaned last word. */
export const toolTitleStyle = css({ textWrap: "pretty" });

export const ctaLinkStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  color: "primary",
  textStyle: "label.md",
  marginTop: "auto",
  paddingTop: "2",
});
