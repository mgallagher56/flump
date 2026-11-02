import { css } from "styled-system/css";

export const headerStyles = css({
  position: "sticky",
  top: 0,
  zIndex: 50,
  width: "100%",
  backgroundColor: {
    base: "rgba(255, 255, 255, 0.85)",
    _dark: "rgba(22, 24, 29, 0.85)",
  },
  backdropFilter: "blur(12px)",
  transition: "background-color 0.2s ease, border-color 0.2s ease",
});

export const navStyles = css({
  position: "sticky",
  top: 0,
  zIndex: 50,
  display: "flex",
  borderBottomWidth: "2px",
  borderBottomColor: "border",
  borderBottomStyle: "solid",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  paddingY: { base: "3", md: "4" },
  paddingX: "2",
});

export const menuStyles = css({
  display: "flex",
  gap: "4",
  alignItems: "center",
  justifyContent: "start",
});

export const desktopMenuLinksStyles = css({
  display: { base: "none", md: "flex" },
  gap: "4",
  alignItems: "center",
});

export const loginStyles = css({
  display: "flex",
  gap: "2",
  alignItems: "center",
  justifyContent: "end",
});

export const mobileMenuButtonStyles = css({
  display: { base: "inline-flex", md: "none" },
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border",
  backgroundColor: "surface",
  color: "text.primary",
  cursor: "pointer",
  transition: "all 0.2s ease",
  _hover: {
    borderColor: "primary",
    color: "primary",
  },
});
