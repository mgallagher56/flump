import { css } from "@repo/ui/styled-system/css";

/** Prototype 11's soft card: roomier padding and a rounder corner than a plain card. */
export const closeGlass = css({ p: "clamp(24px, 3vw, 48px)", borderRadius: "28px" });

/** The ticket, the question, one line and the button, centred in one glass card. */
export const closeCard = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4",
  textAlign: "center",
  // From 90rem the button grows with the heading (prototype 11).
  "@media (min-width: 90rem)": { "& a": { height: "auto", py: "4", px: "9", fontSize: "lg" } },
});

/** The getting started ticket, at its 280px floor or wider (STYLE-GUIDE 8.3), up to 30rem. */
export const closePicture = css({
  width: "min(30rem, max(280px, 100vw - 96px))",
  maxWidth: "full",
  mx: "auto",
  mb: "2",
});

export const closeTitle = css({
  textStyle: "heading.xl",
  fontSize: { base: "3xl", md: "4xl", xl: "5xl" },
  lineHeight: "heading",
  color: "text.primary",
  margin: 0,
  textWrap: "balance",
});

export const closeText = css({
  textStyle: "body.lg",
  fontSize: { base: "lg", lg: "xl" },
  color: "text.secondary",
  margin: 0,
  mb: "2",
});
