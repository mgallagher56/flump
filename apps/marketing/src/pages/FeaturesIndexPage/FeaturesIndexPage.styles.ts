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
  base: { maxWidth: "6xl", mx: "auto", display: "flex", flexDirection: "column", gap: "10" },
});

export const headerBlock = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", maxWidth: "3xl" },
});

export const heading = cva({
  base: { textStyle: "display", color: "text.primary", margin: 0 },
});

export const lead = cva({
  base: { textStyle: { base: "body.md", md: "body.lg" }, color: "text.secondary", margin: 0 },
});

export const introText = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const ctaRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3" },
});

export const featureGrid = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
    gap: { base: "4", md: "6" },
  },
});

export const featureCard = cva({
  base: { display: "flex", flexDirection: "column", gap: "2", height: "100%" },
});

export const featureName = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0 },
});

/** The card's one link, on its name. Underlined so it reads as a link without colour alone. */
export const featureLink = cva({
  base: {
    color: "primary",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const featureLead = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const featureNote = cva({
  base: { textStyle: "body.sm", color: "text.secondary", margin: 0 },
});
