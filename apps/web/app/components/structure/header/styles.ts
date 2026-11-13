import { css } from "styled-system/css";

export const headerStyles = css({
  position: "sticky",
  top: 0,
  zIndex: 50,
  width: "100%",
  backgroundColor: "surface.overlay",
  backdropFilter: "blur(12px)",
  borderBottomWidth: "1px",
  borderBottomColor: "border.subtle",
  borderBottomStyle: "solid",
  _motionSafe: {
    transitionProperty: "background-color, border-color",
    transitionDuration: "base",
    transitionTimingFunction: "standard",
  },
});

export const navStyles = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  maxWidth: "1536px",
  margin: "0 auto",
  paddingY: { base: "3", md: "3" },
  paddingX: { base: "12px", md: "24px" },
});

export const menuStyles = css({
  display: "flex",
  gap: "4",
  alignItems: "center",
  justifyContent: "start",
});

// Labels never wrap: below lg the menu collapses into the drawer instead of squeezing the labels.
export const desktopMenuLinksStyles = css({
  display: { base: "none", lg: "flex" },
  gap: { lg: "1", xl: "3" },
  alignItems: "center",
  whiteSpace: "nowrap",
  minWidth: 0,
});

export const loginStyles = css({
  display: "flex",
  gap: "2",
  alignItems: "center",
  justifyContent: "end",
});

export const profileLink = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  outline: "none",
  _hover: { boxShadow: "xs" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

export const srOnly = css({ srOnly: true });

export const mobileMenuButtonStyles = css({
  display: { base: "inline-flex", lg: "none" },
  alignItems: "center",
  justifyContent: "center",
  width: "44px",
  height: "44px",
  borderRadius: "lg",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  backgroundColor: "surface.card",
  color: "text.primary",
  cursor: "pointer",
  _motionSafe: {
    transitionProperty: "border-color, color",
    transitionDuration: "fast",
    transitionTimingFunction: "standard",
  },
  _hover: { borderColor: "primary.border", color: "primary" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  "&[data-mobile='true']": { display: "inline-flex" },
});
