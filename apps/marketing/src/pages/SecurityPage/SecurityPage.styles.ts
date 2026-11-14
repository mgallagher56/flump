import { cva } from "@repo/ui/styled-system/css";

export const pageShell = cva({
  base: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "surface.canvas",
  },
});

export const mainContent = cva({
  base: { flex: "1", px: "4", py: { base: "12", md: "16" }, _focus: { outline: "none" } },
});

export const container = cva({
  base: { maxWidth: "3xl", mx: "auto", display: "flex", flexDirection: "column", gap: "8" },
});

export const headerBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "3" },
});

export const heading = cva({
  base: { textStyle: "heading.xl", color: "text.primary", margin: 0 },
});

export const intro = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
});

export const factList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

export const factItem = cva({
  base: { display: "flex", alignItems: "flex-start", gap: "4" },
});

export const factText = cva({
  base: { textStyle: "body.md", color: "text.primary", margin: 0, pt: "2" },
});

export const factLink = cva({
  base: {
    color: "text.primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
  },
});
