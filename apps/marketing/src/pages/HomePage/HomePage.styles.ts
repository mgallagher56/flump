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
    pb: { base: "12", md: "16" },
    backgroundColor: "surface.canvas",
  },
});

export const heroInner = cva({
  base: {
    maxWidth: "6xl",
    mx: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: { base: "8", md: "10" },
  },
});

export const heroText = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5",
    textAlign: "center",
    maxWidth: "3xl",
  },
});

export const heroHeading = cva({
  base: { textStyle: "display", color: "text.primary", margin: 0 },
});

export const heroLead = cva({
  base: { textStyle: "body.lg", color: "text.secondary", margin: 0 },
});

export const ctaRow = cva({
  base: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "3" },
});

export const finalCta = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4",
    textAlign: "center",
    // Sits under the FAQ in the same band, separated by space and a hairline, not a second band.
    mt: { base: "12", md: "16" },
    pt: { base: "10", md: "12" },
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: "border.subtle",
    scrollMarginTop: "24",
  },
});

export const finalCtaTitle = cva({
  base: { textStyle: "heading.lg", color: "text.primary", margin: 0 },
});

export const finalCtaBody = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});
