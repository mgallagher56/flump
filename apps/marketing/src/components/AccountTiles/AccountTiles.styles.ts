import { css } from "@repo/ui/styled-system/css";

/*
 * The accounts set piece (prototype 11's `p11-v-accounts`): six small glass cards in a grid, two
 * columns and three from 34rem of its own width, then the net worth card. At rest no card lies on
 * another; in flight the card dealt later is on top. Neutral glass and ink only (MK5).
 */

export const wrap = css({
  position: "relative",
  containerType: "inline-size",
  minWidth: "0",
  paddingBlock: "2",
});

export const body = css({
  position: "relative",
  display: "grid",
  gap: "18px",
});

export const deck = css({
  position: "relative",
  listStyle: "none",
  margin: "0",
  padding: "0",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  "@container (min-width: 34rem)": {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  // A card dealt later lies on top while in flight.
  "& > li:nth-child(1)": { zIndex: "1" },
  "& > li:nth-child(2)": { zIndex: "2" },
  "& > li:nth-child(3)": { zIndex: "3" },
  "& > li:nth-child(4)": { zIndex: "4" },
  "& > li:nth-child(5)": { zIndex: "5" },
  "& > li:nth-child(6)": { zIndex: "6" },
});

export const deal = css({
  position: "relative",
  display: "grid",
  minWidth: "0",
});

const glass = {
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "material.glass.border",
  backgroundColor: "material.glass.fill",
  boxShadow: "card",
} as const;

export const card = css({
  ...glass,
  display: "grid",
  gap: "2px",
  minWidth: "0",
  padding: { base: "10px 12px 9px", md: "14px 16px 12px" },
  borderRadius: "16px",
  backgroundImage: "linear-gradient(160deg, token(colors.material.glass.sheen), transparent 50%)",
});

export const cardName = css({
  color: "text.secondary",
  fontSize: "sm",
  lineHeight: "1.3",
});

export const cardAmount = css({
  color: "text.primary",
  fontSize: { base: "lg", md: "xl", xl: "2xl" },
  fontWeight: "bold",
  letterSpacing: "-0.01em",
  overflowWrap: "anywhere",
  fontVariantNumeric: "tabular-nums",
});

export const cardKind = css({
  color: "text.secondary",
  fontSize: "xs",
});

export const total = css({
  ...glass,
  display: "grid",
  gap: "2px",
  justifyItems: "start",
  width: "fit-content",
  padding: { base: "10px 16px", md: "14px 20px" },
  borderRadius: "18px",
  "& > p": { margin: "0" },
});

export const totalLabel = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  color: "text.secondary",
  fontSize: "md",
  fontWeight: "semibold",
});

export const totalFigure = css({
  color: "text.primary",
  fontSize: { base: "4xl", lg: "5xl" },
  fontWeight: "bold",
  lineHeight: "1.05",
  letterSpacing: "-0.03em",
});

export const caption = css({
  color: "text.secondary",
  fontSize: "sm",
});
