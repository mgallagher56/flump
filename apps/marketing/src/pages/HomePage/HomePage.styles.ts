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
    // Less top room in a short viewport (a phone in landscape, 375px tall), so the hero card
    // starts in the first view (P72). Written out, not a constant, so Panda extracts it.
    "@media screen and (max-height: 30rem)": { pt: "6" },
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
    "@media screen and (max-height: 30rem)": { gap: "6" },
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

/**
 * The closing scene: no figures follow it, so it never pushes one down on a phone (B10). 192px
 * on a phone, 320px from `md` (was 112px and 140px).
 */
export const finalCtaIllustration = cva({
  base: { width: "full", maxWidth: { base: "48", md: "xs" } },
});

/**
 * "Start with rough figures": the steps and, from `lg`, the scene beside them, so it fills the
 * spare space instead of floating alone under the cards.
 */
export const stepLayout = cva({
  base: {
    display: "grid",
    gridTemplateColumns: { base: "1fr", lg: "minmax(0, 7fr) minmax(0, 5fr)" },
    alignItems: "center",
    gap: { base: "6", lg: "12" },
  },
});

/** Three numbered steps: side by side on a tablet, stacked beside the scene from `lg`. */
export const stepGrid = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)", lg: "1fr" },
    gap: { base: "4", md: "6", lg: "4" },
  },
});

export const stepTitle = cva({
  base: { textStyle: "heading.md", color: "text.primary", margin: 0, mb: "2" },
});

export const stepBody = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0 },
});

/** The steps' scene (B10): from `lg` up only, 320px wide beside the steps (was 140px). */
export const bandIllustration = cva({
  base: { display: { base: "none", lg: "block" }, width: "full", maxWidth: "xs", mx: "auto" },
});

export const bandFooter = cva({
  base: { textStyle: "body.md", color: "text.secondary", margin: 0, mt: "6" },
});

export const bandLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});

export const depthList = cva({
  base: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
    gap: { base: "4", md: "6" },
  },
});

export const depthItem = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    textStyle: "body.md",
    color: "text.primary",
    pl: "4",
    borderLeftWidth: "2px",
    borderLeftStyle: "solid",
    borderLeftColor: "border",
  },
});
