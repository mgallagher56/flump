import { css } from "@repo/ui/styled-system/css";

/** The band: positioned, and its own stacking context, so the bubble layer sits under the content. */
export const closeBand = css({ position: "relative", isolation: "isolate" });

/** Under everything in the band, above the band's own fill (MK8: never over text). */
export const bubbleLayer = css({ position: "absolute", inset: 0, zIndex: -1 });

/** The ticket, the question, one line and the button, centred in one glass card. */
export const closeCard = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4",
  textAlign: "center",
});

/** The getting started ticket, at its 280px floor or wider (STYLE-GUIDE 8.3). */
export const closePicture = css({ width: "full", maxWidth: "sm", mb: "2" });

export const closeTitle = css({
  textStyle: "heading.xl",
  color: "text.primary",
  margin: 0,
  textWrap: "balance",
});

export const closeText = css({ textStyle: "body.lg", color: "text.secondary", margin: 0, mb: "2" });
