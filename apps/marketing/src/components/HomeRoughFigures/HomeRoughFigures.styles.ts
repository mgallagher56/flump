import { css } from "@repo/ui/styled-system/css";

/** The band: positioned, and its own stacking context, so the bubble layer sits under the content. */
export const roughBand = css({ position: "relative", isolation: "isolate" });

/** Under everything in the band, above the band's own fill (MK8: never over text). */
export const bubbleLayer = css({ position: "absolute", inset: 0, zIndex: -1 });

/** The steps and, from `lg`, the calendar page beside them in the spare space. */
export const roughLayout = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "minmax(0, 1fr) auto" },
  alignItems: "center",
  gap: { base: "8", lg: "16" },
});

export const steps = css({ position: "relative" });

/** The faint track behind the nodes, from the first node's centre to the last. */
export const stepsTrack = css({
  position: "absolute",
  left: "21px",
  top: "22px",
  bottom: "22px",
  width: "2px",
  borderRadius: "full",
  backgroundColor: "border",
});

/** The line that draws down the track once, by time. Drawn complete without script (MK1). */
export const stepsLine = css({
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  backgroundColor: "chart.primary",
  transformOrigin: "top center",
});

export const stepList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "7",
});

export const step = css({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "44px 1fr",
  columnGap: "4",
  rowGap: "1",
});

/** The step's number on a filled circle: words on `primary.solid` take `primary.foreground`. */
export const stepNode = css({
  gridRow: "span 2",
  display: "grid",
  placeItems: "center",
  width: "44px",
  height: "44px",
  borderRadius: "full",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "primary",
  backgroundColor: "primary.solid",
  color: "primary.foreground",
  textStyle: "label.md",
  fontWeight: "bold",
  fontVariantNumeric: "tabular-nums",
});

export const stepTitle = css({
  textStyle: "heading.md",
  color: "text.primary",
  margin: 0,
  mt: "2",
});

export const stepBody = css({
  textStyle: "body.md",
  color: "text.secondary",
  margin: 0,
  maxWidth: "2xl",
});

/** The calendar page: from `lg` only, beside the steps (B10: never pushes a figure down a phone). */
export const roughPicture = css({
  display: { base: "none", lg: "block" },
  width: "full",
  maxWidth: "xs",
  justifySelf: "center",
});
