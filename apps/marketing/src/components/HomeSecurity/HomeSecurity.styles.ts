import { css } from "@repo/ui/styled-system/css";

/** The band: positioned, and its own stacking context, so the bubble layer sits under the content. */
export const securityBand = css({ position: "relative", isolation: "isolate" });

/** Under everything in the band, above the band's own fill (MK8: never over text). */
export const bubbleLayer = css({ position: "absolute", inset: 0, zIndex: -1 });

/** The picture beside the words from `md`, above them on a phone. */
export const securityRow = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "center" },
  gap: { base: "6", md: "12" },
});

/** The security document picture, at its 280px floor so its text stays readable (STYLE-GUIDE 8.3). */
export const securityPicture = css({ flexShrink: 0, width: "full", maxWidth: "280px" });

export const securityText = css({ display: "grid", gap: "3", maxWidth: "xl" });

export const securityTitle = css({ textStyle: "heading.xl", color: "text.primary", margin: 0 });

export const securityBody = css({ textStyle: "body.lg", color: "text.secondary", margin: 0 });

export const securityMore = css({ margin: 0, mt: "1" });

export const securityLink = css({
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
