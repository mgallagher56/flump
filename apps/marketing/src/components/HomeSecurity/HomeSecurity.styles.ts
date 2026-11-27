import { css } from "@repo/ui/styled-system/css";

/** Prototype 11's soft card: roomier padding and a rounder corner than a plain card. */
export const securityCard = css({
  p: "clamp(24px, 3vw, 48px)",
  borderRadius: "28px",
});

/** The picture beside the words from `md`, above them on a phone. */
export const securityRow = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  alignItems: { base: "flex-start", md: "center" },
  gap: { base: "6", md: "12" },
});

/** The security document picture, at its 280px floor so its text stays readable (STYLE-GUIDE 8.3). */
export const securityPicture = css({ flexShrink: 0, width: "full", maxWidth: "280px" });

export const securityText = css({ display: "grid", gap: "3", maxWidth: "36rem" });

/** Larger than a band heading, as prototype 11's: the card's one heading. */
export const securityTitle = css({
  textStyle: "heading.xl",
  fontSize: { base: "3xl", lg: "4xl" },
  lineHeight: "heading",
  color: "text.primary",
  margin: 0,
});

export const securityBody = css({
  textStyle: "body.lg",
  fontSize: { base: "md", lg: "lg", "2xl": "xl" },
  lineHeight: "prose",
  color: "text.secondary",
  margin: 0,
});

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
