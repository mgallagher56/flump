import { css, cva } from "@repo/ui/styled-system/css";

/** The band: positioned, and its own stacking context, so the bubble layer sits under the content. */
export const faqBand = css({ position: "relative", isolation: "isolate" });

/**
 * Under everything in the band. Only while the band is full width: side by side with More detail
 * from `lg`, a half has no gutter to hold a bubble clear of the text, so the field is not shown (MK8).
 */
export const bubbleLayer = css({
  position: "absolute",
  inset: 0,
  zIndex: -1,
  display: { base: "block", lg: "none" },
});

export const faqList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "3",
});

export const faqItem = css({
  backgroundColor: "surface.card",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "lg",
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
      false: { gridTemplateRows: "0fr", visibility: "hidden" },
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
});

// Links are teal in light and mint in dark (Midnight and Mint).
export const faqLink = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
});
