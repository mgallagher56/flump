import { css } from "@repo/ui/styled-system/css";

/** Prototype 11's soft card: roomier padding; its corner is the `showcase` radius, on the card. */
export const closeGlass = css({ p: "clamp(24px, 3vw, 48px)" });

/** The stack, the question, one line, the button and the sign-in line, centred in one glass card. */
export const closeCard = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4",
  textAlign: "center",
  // From 90rem the button grows with the heading (prototype 11). Only the button: the sign-in
  // line's link stays inline text.
  "@media (min-width: 90rem)": { "& > a": { height: "auto", py: "4", px: "9", fontSize: "lg" } },
});

/** The picture across the card; the stack keeps to its own box inside it (`CloseStack`). */
export const closePicture = css({ width: "full", mb: "2" });

/**
 * The question, on one line in the card from 1024px (prototype 11's `p11-close__title`, which
 * grows from 1.75rem to 3rem with the screen and is about 34 to 42px there): the nearest scale
 * steps, 30px and then 36px. At 48px it wrapped to two lines in the 768px card.
 */
export const closeTitle = css({
  textStyle: "heading.xl",
  fontSize: { base: "3xl", lg: "4xl" },
  lineHeight: "1.15",
  letterSpacing: "-0.01em",
  color: "text.primary",
  margin: 0,
  textWrap: "balance",
});

/** The one line under it (`p11-close__text`, about 17 to 20px): 18px, then 20px from 1280px. */
export const closeText = css({
  textStyle: "body.lg",
  fontSize: { base: "lg", xl: "xl" },
  color: "text.secondary",
  margin: 0,
  mb: "2",
});
