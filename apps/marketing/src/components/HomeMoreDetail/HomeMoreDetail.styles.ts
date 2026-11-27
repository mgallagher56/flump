import { css } from "@repo/ui/styled-system/css";

/** The band: positioned, and its own stacking context, so the bubble layer sits under the content. */
export const detailBand = css({ position: "relative", isolation: "isolate" });

/**
 * Under everything in the band. Only while the band is full width: side by side with the questions
 * from `lg`, a half has no gutter to hold a bubble clear of the text, so the field is not shown (MK8).
 */
export const bubbleLayer = css({
  position: "absolute",
  inset: 0,
  zIndex: -1,
  display: { base: "block", lg: "none" },
});

export const detailList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "3",
});

/** One deeper tool: the link beside the words from `sm`, under them in a half from `lg`. */
export const detailItem = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", sm: "minmax(0, 1fr) auto", lg: "minmax(0, 1fr)" },
  alignItems: "center",
  gap: "2 4",
});

export const detailText = css({ textStyle: "body.md", color: "text.primary" });

export const detailLink = css({
  color: "primary",
  fontWeight: "semibold",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  _hover: { color: "primary.emphasis" },
  _focusVisible: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
});
