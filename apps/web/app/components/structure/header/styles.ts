import { css } from "styled-system/css";

export const headerStyles = css({
  position: "sticky",
  top: 0,
  zIndex: 50,
  width: "100%",
  backgroundColor: {
    base: "rgba(255, 255, 255, 0.92)",
    _dark: "rgba(11, 15, 23, 0.92)",
  },
  backdropFilter: "blur(12px)",
  borderBottomWidth: "1px",
  borderBottomColor: "border",
  borderBottomStyle: "solid",
  transition: "background-color 0.2s ease, border-color 0.2s ease",
});

export const navStyles = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  maxWidth: "1536px",
  margin: "0 auto",
  paddingY: { base: "3", md: "4" },
  paddingX: { base: "12px", md: "24px" },
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
