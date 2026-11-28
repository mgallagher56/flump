import { css } from "@repo/ui/styled-system/css";

/** The close: the picture, the question, one line and the button, in one card. */
export const closeCard = css({
  display: "grid",
  justifyItems: "center",
  gap: "4",
  textAlign: "center",
  p: "clamp(24px, 3vw, 48px)",
  borderRadius: "28px",
});

/** The picture across the card; the stack keeps to its own box inside it (`CloseStack`). */
export const closePicture = css({ width: "full" });

export const closeTitle = css({
  margin: 0,
  fontWeight: "bold",
  // The prototype's clamp (24px to 32px with the screen) on the type scale: 24px, then 30px.
  fontSize: { base: "2xl", md: "3xl" },
  lineHeight: "1.2",
  color: "text.primary",
  textWrap: "balance",
});

export const closeText = css({ margin: 0, color: "text.secondary" });
