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

export const placeholderNote = cva({
  base: { color: "text.muted" },
});

export const cardGrid = cva({
  base: { display: "flex", flexDirection: "column", gap: "6" },
});

export const card = cva({
  base: { display: "flex", flexDirection: "column", gap: "4" },
});

export const cardHeading = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

export const body = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const link = cva({
  base: {
    color: "text.primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    overflowWrap: "anywhere",
    _hover: { color: "primary.hover" },
  },
});
