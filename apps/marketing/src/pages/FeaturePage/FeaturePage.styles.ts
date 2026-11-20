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
  base: { flex: "1", _focus: { outline: "none" } },
});

export const hero = cva({
  base: {
    px: "4",
    pt: { base: "12", md: "16" },
    pb: { base: "10", md: "12" },
    backgroundColor: "surface.canvas",
    "@media screen and (max-height: 30rem)": { pt: "6" },
  },
});

export const heroInner = cva({
  base: {
    maxWidth: "6xl",
    mx: "auto",
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    alignItems: { base: "flex-start", md: "center" },
    justifyContent: "space-between",
    gap: { base: "8", md: "10" },
  },
});

export const heroText = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "4",
    maxWidth: "3xl",
  },
});

/** The area's own name, as the app names it, above the h1. */
export const areaLabel = cva({
  base: { textStyle: "label.md", color: "text.secondary", margin: 0 },
});

export const heroHeading = cva({
  base: { textStyle: "display", color: "text.primary", margin: 0 },
});

export const heroLead = cva({
  base: { textStyle: { base: "body.md", md: "body.lg" }, color: "text.secondary", margin: 0 },
});

export const heroNote = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

export const ctaRow = cva({
  base: { display: "flex", flexWrap: "wrap", gap: "3" },
});

export const factGrid = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
    gap: { base: "4", md: "6" },
  },
});

export const factText = cva({
  base: { textStyle: "body.md", color: "text.primary", margin: 0 },
});

export const depthList = cva({
  base: {
    margin: 0,
    pl: "5",
    display: "flex",
    flexDirection: "column",
    gap: "2",
    textStyle: "body.md",
    color: "text.primary",
  },
});

export const finalCta = cva({
  base: {
    px: "4",
    py: { base: "12", md: "16" },
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4",
    textAlign: "center",
  },
});

export const finalCtaTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const finalCtaBody = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

/** Under the debt facts: the app's fixed MoneyHelper debt line (D10). */
export const factFooter = cva({
  base: { mt: "6" },
});

export const retirementBody = cva({
  base: { display: "flex", flexDirection: "column", gap: "4", maxWidth: "3xl" },
});

export const retirementText = cva({
  base: { textStyle: "body.md", color: "text.primary", margin: 0 },
});
