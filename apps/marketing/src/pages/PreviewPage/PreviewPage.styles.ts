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
    flex: 1,
    display: "flex",
    flexDirection: "column",
    outline: "none",
  },
});

export const container = cva({
  base: {
    width: "100%",
    maxWidth: "4xl",
    mx: "auto",
    px: { base: "4", md: "6", lg: "8" },
    // The marketing page top, shared with pricing, security, contact and the tools index (P73).
    py: { base: "12", md: "16" },
  },
});

/**
 * The three moments and the closing call to action. The gap sits between them only: the page
 * header keeps its own space below, so "Dashboard picture" is not pushed down twice (P73).
 */
export const sections = cva({
  base: { display: "flex", flexDirection: "column", gap: { base: "10", md: "14" } },
});

export const previewSection = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "3",
  },
});

export const sectionDescription = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: 0,
    maxWidth: "2xl",
  },
});

export const ctaBlock = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "4",
    p: { base: "6", md: "8" },
    borderRadius: "2xl",
    backgroundColor: "surface.card",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border.subtle",
    boxShadow: "sm",
  },
});

export const ctaTitle = cva({
  base: {
    textStyle: "heading.md",
    color: "text.primary",
    margin: 0,
    fontWeight: "bold",
  },
});

export const ctaText = cva({
  base: {
    textStyle: "body.md",
    color: "text.secondary",
    margin: 0,
    maxWidth: "md",
  },
});

/** The heading and description above a preview frame: heading, description, then the frame. */
export const sectionIntro = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    minWidth: "0",
  },
});

export const sectionHeading = cva({
  base: {
    textStyle: "heading.md",
    color: "text.primary",
    margin: 0,
  },
});

/** Intro beside an illustration on large screens; the illustration is hidden below `lg`. */
export const sectionHeader = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "6",
  },
});

export const sectionIllustration = cva({
  base: {
    display: { base: "none", lg: "block" },
    flexShrink: 0,
    // 256px beside the intro (was 144px), matching the home page's larger scenes.
    width: "64",
  },
});

/**
 * The page's one phone-width illustration: above the closing call to action, with no figures.
 * 160px on a phone, 320px from `md` (was 140px), as on the home page.
 */
export const ctaIllustration = cva({
  base: {
    display: "flex",
    justifyContent: "center",
    width: "full",
    maxWidth: { base: "40", md: "xs" },
    mx: "auto",
  },
});

/** Under each sample: one link to the feature page that explains it (E42 S6; never "Read more"). */
export const sectionLinkRow = cva({
  base: { textStyle: "body.md", margin: 0 },
});

export const sectionLink = cva({
  base: {
    color: "primary",
    fontWeight: "semibold",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    _hover: { color: "primary.hover" },
    _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
  },
});
