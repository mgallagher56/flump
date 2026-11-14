import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
    color: "text.primary",
  },
});

export const mainContent = cva({
  base: {
    flex: "1",
    width: "100%",
    maxWidth: "2xl",
    mx: "auto",
    py: { base: "16", md: "24" },
    px: "4",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4",
    textAlign: "center",
    _focus: { outline: "none" },
  },
});

export const headingStyle = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
});

export const bodyStyle = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
});

export const homeLinkStyle = cva({
  base: {
    color: "text.primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focusRing",
      outlineOffset: "2px",
    },
  },
});
