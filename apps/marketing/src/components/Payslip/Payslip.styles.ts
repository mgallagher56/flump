import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The payslip set piece (prototype 11's `p11-v-pay` and `p11-v-slip`): a paper payslip folded in
 * three, each third with a face, a back and a shade for the unfold. At rest it lies open and flat.
 * Neutral ink and paper only; the one mint mark is the rule under take-home pay.
 */

export const wrap = css({
  display: "grid",
  placeItems: "center",
  perspective: "1400px",
  perspectiveOrigin: "50% 30%",
});

export const slip = css({
  width: "min(100%, 25rem)",
  display: "grid",
  transformStyle: "preserve-3d",
  margin: "0",
});

export const panel = cva({
  base: { position: "relative", transformStyle: "preserve-3d" },
  variants: {
    /**
     * `journey`: the home journey's heights. `setPiece`: an area page's set piece, as the approved
     * area prototypes (prototype 11's own `clamp(6.5rem, 15vh, 8.5rem)` from 48rem).
     */
    size: {
      journey: { height: { base: "6rem", md: "7.5rem", lg: "8.5rem" } },
      setPiece: { height: { base: "6rem", md: "clamp(6.5rem, 15vh, 8.5rem)" } },
    },
    fold: {
      top: { zIndex: "2", transformOrigin: "50% 100%" },
      middle: {},
      bottom: { zIndex: "1", transformOrigin: "50% 0" },
    },
  },
  defaultVariants: { size: "journey" },
});

const layer = {
  position: "absolute",
  inset: "0",
} as const;

export const face = cva({
  base: {
    ...layer,
    display: "grid",
    alignContent: "center",
    gap: { base: "1", md: "2" },
    padding: { base: "10px 16px", md: "14px 22px" },
    backgroundColor: "surface.card",
    borderInlineWidth: "1px",
    borderInlineStyle: "solid",
    borderInlineColor: "border",
    backfaceVisibility: "hidden",
    color: "text.primary",
  },
  variants: {
    fold: {
      top: {
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: "border",
        borderRadius: "18px 18px 0 0",
        backgroundImage:
          "linear-gradient(160deg, color-mix(in oklab, {colors.text.onContrast} 7%, transparent), transparent 55%)",
      },
      middle: {
        boxShadow:
          "0 18px 36px -12px color-mix(in oklab, {colors.text.primary} 18%, transparent), inset 0 1px 0 color-mix(in oklab, {colors.text.primary} 8%, transparent), inset 0 -1px 0 color-mix(in oklab, {colors.text.primary} 8%, transparent)",
      },
      bottom: {
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: "border",
        borderRadius: "0 0 18px 18px",
      },
    },
  },
});

export const back = cva({
  base: {
    ...layer,
    backgroundColor: "color-mix(in oklab, {colors.surface.card} 90%, {colors.text.primary})",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "border",
    transform: "rotateX(180deg)",
    backfaceVisibility: "hidden",
  },
  variants: {
    fold: {
      top: { borderRadius: "18px 18px 0 0" },
      bottom: { borderRadius: "0 0 18px 18px" },
    },
  },
});

export const shade = cva({
  base: {
    ...layer,
    pointerEvents: "none",
    opacity: "0",
    borderRadius: "inherit",
  },
  variants: {
    fold: {
      top: {
        background:
          "linear-gradient(0deg, color-mix(in oklab, {colors.text.primary} 30%, transparent), transparent)",
      },
      bottom: {
        background:
          "linear-gradient(180deg, color-mix(in oklab, {colors.text.primary} 30%, transparent), transparent)",
      },
    },
  },
});

export const head = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "2",
  margin: "0",
  fontSize: "lg",
  fontWeight: "bold",
});

export const rows = css({
  display: "grid",
  gap: "6px",
  margin: "0",
  "& > div": {
    display: "flex",
    justifyContent: "space-between",
    gap: "3",
    fontSize: { base: "sm", md: "md" },
  },
  "& dt": { color: "text.secondary" },
  "& dd": { margin: "0", fontVariantNumeric: "tabular-nums" },
});

export const net = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "3",
  margin: "0",
  fontSize: "md",
  "& strong": {
    fontSize: { base: "2xl", lg: "3xl" },
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
});

export const rule = css({
  display: "block",
  height: "2px",
  borderRadius: "2px",
  // A graphic-only fill: the mint chart colour.
  backgroundColor: "chart.primary",
  transformOrigin: "left center",
});
