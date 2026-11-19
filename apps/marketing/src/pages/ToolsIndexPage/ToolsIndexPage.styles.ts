import { css } from "@repo/ui/styled-system/css";

export const pageStyle = css({ minHeight: "100vh", display: "flex", flexDirection: "column" });

export const mainStyle = css({ flex: "1" });

/**
 * Same width as the web `/tools` index (`SignedOutPage width="wide"`). The top spacing is the
 * marketing one (`MarketingSection`, pricing, security and contact), so every marketing page's
 * heading starts at the same height (P73).
 */
export const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "4",
  pt: { base: "12", md: "16" },
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

/**
 * Dark mode: the domain tints sit close to the dark card (1.05:1 for apricot), so the tile takes a
 * `border.input` edge (4.3:1 against `surface.card`) to stay visible (P77).
 */
export const toolIconTileStyle = css({
  _dark: { borderWidth: "1px", borderStyle: "solid", borderColor: "border.input" },
  _systemDark: { borderWidth: "1px", borderStyle: "solid", borderColor: "border.input" },
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
