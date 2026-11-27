import { css, cva } from "@repo/ui/styled-system/css";

export const faqList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "3",
  "@media (min-width: 90rem)": { gap: "3.5" },
});

/** As prototype 11: canvas with a soft shadow, a rounder corner. */
export const faqItem = css({
  backgroundColor: "surface.canvas",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "xl",
  boxShadow: "xs",
  overflow: "hidden",
});

export const faqQuestion = css({
  width: "100%",
  px: { base: "4", md: "5" },
  py: "4",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "4",
  backgroundColor: "transparent",
  border: "none",
  textAlign: "left",
  textStyle: "heading.sm",
  color: "text.primary",
  cursor: "pointer",
  // From 90rem, side by side with More detail, the questions grow with the page (prototype 11).
  "@media (min-width: 90rem)": {
    fontSize: "lg",
    py: "clamp(1.1rem, 0.6rem + 0.5vw, 1.4rem)",
    px: "clamp(1.2rem, 0.7rem + 0.5vw, 1.6rem)",
  },
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "-2px",
  },
});

export const faqChevron = cva({
  base: {
    display: "inline-flex",
    flexShrink: 0,
    color: "text.muted",
    _motionSafe: {
      transitionProperty: "transform",
      transitionDuration: "marketing.disclosure",
      transitionTimingFunction: "marketing.calmInOut",
    },
  },
  variants: { open: { true: { transform: "rotate(180deg)" }, false: {} } },
  defaultVariants: { open: false },
});

/**
 * The answer opens in place: its row grows from nothing to its own height over
 * `durations.marketing.disclosure`, so what follows moves down smoothly and nothing overlaps
 * (MK9). With reduced motion it opens at once. A closed answer stays in the page, hidden and inert;
 * `visibility` waits for the height to close before it hides the words.
 */
export const faqAnswer = cva({
  base: {
    display: "grid",
    _motionSafe: {
      transitionProperty: "grid-template-rows, visibility",
      transitionDuration: "marketing.disclosure",
      transitionTimingFunction: "marketing.calmInOut",
    },
  },
  variants: {
    open: {
      true: { gridTemplateRows: "1fr", visibility: "visible" },
      // Collapsed only where script runs: the theme script marks <html data-theme> before first
      // paint, so with no JavaScript every answer stays open and readable (MK1).
      false: {
        "html[data-theme] &": { gridTemplateRows: "0fr", visibility: "hidden" },
      },
    },
  },
  defaultVariants: { open: false },
});

export const faqAnswerInner = css({ minHeight: 0, overflow: "hidden" });

export const faqAnswerText = css({
  margin: 0,
  px: { base: "4", md: "5" },
  pb: "4",
  textStyle: "body.md",
  color: "text.secondary",
  "@media (min-width: 90rem)": {
    fontSize: "lg",
    lineHeight: "1.55",
    px: "clamp(1.2rem, 0.7rem + 0.5vw, 1.6rem)",
    pb: "5",
  },
});

// Links are teal in light and mint in dark (Midnight and Mint).
export const faqLink = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
});
