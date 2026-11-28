import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The six pieces of a household's money as document cards built from tokens: the home hero's
 * floating pieces and the close's gathered stack draw the same cards. Moved here from
 * `HomeHero.styles.ts` unchanged.
 */

/**
 * A card's colours as two custom properties, shared by the piece and its row's glyph. Charcoal
 * savings card and a mint credit card; in Midnight both lean towards mint so they stand off
 * the dark page.
 */
export const cardTone = cva({
  variants: {
    tone: {
      savings: {
        "--card-bg": "{colors.surface.contrast}",
        "--card-ink": "{colors.text.onContrast}",
        _dark: {
          "--card-bg": "color-mix(in oklab, {colors.primary} 30%, {colors.surface.card})",
          "--card-ink": "{colors.text.primary}",
        },
        _systemDark: {
          "--card-bg": "color-mix(in oklab, {colors.primary} 30%, {colors.surface.card})",
          "--card-ink": "{colors.text.primary}",
        },
      },
      // Prototype 11: the solid mint hero fill with its own ink in light; a mint-tinted overlay in
      // Midnight.
      credit: {
        "--card-bg": "{colors.surface.hero}",
        "--card-ink": "{colors.text.onHero}",
        _dark: {
          "--card-bg": "color-mix(in oklab, {colors.primary} 12%, {colors.surface.overlay})",
          "--card-ink": "{colors.text.primary}",
        },
        _systemDark: {
          "--card-bg": "color-mix(in oklab, {colors.primary} 12%, {colors.surface.overlay})",
          "--card-ink": "{colors.text.primary}",
        },
      },
    },
  },
});

export const card = css({ position: "relative", width: "16rem", height: "10rem" });

export const cardEdge = css({
  position: "absolute",
  inset: 0,
  borderRadius: "14px",
  transform: "translateZ(-5px)",
  background: "color-mix(in oklab, var(--card-bg) 70%, {colors.text.primary})",
  boxShadow: "0 24px 36px -18px color-mix(in oklab, {colors.text.primary} 55%, transparent)",
});

export const cardFace = css({
  position: "absolute",
  inset: 0,
  borderRadius: "14px",
  display: "grid",
  gridTemplateRows: "auto 1fr auto auto",
  padding: "4",
  overflow: "hidden",
  color: "var(--card-ink)",
  background:
    "linear-gradient(150deg, color-mix(in oklab, var(--card-bg) 88%, var(--card-ink)) 0%, var(--card-bg) 46%, color-mix(in oklab, var(--card-bg) 82%, {colors.text.primary}) 100%)",
  boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--card-ink) 14%, transparent)",
});

export const cardTop = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});

export const cardName = css({ textStyle: "label.md" });

/** The "Example" tag on a card face, in the card's own ink (real text, as on paper). */
export const cardTag = css({
  display: "inline-block",
  px: "2",
  py: "2px",
  borderRadius: "full",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "color-mix(in oklab, currentColor 45%, transparent)",
  textStyle: "label.sm",
  whiteSpace: "nowrap",
});

export const cardChip = css({
  alignSelf: "center",
  width: "2.3rem",
  height: "1.75rem",
  borderRadius: "sm",
  background:
    "linear-gradient(140deg, color-mix(in oklab, var(--card-ink) 78%, {colors.primary}), color-mix(in oklab, var(--card-ink) 52%, var(--card-bg)))",
});

export const cardWave = css({
  alignSelf: "center",
  width: "4.5rem",
  height: "1.6rem",
  background:
    "radial-gradient(circle at 30% 50%, color-mix(in oklab, var(--card-ink) 30%, transparent) 0 0.75rem, transparent 0.78rem), radial-gradient(circle at 62% 50%, color-mix(in oklab, var(--card-ink) 18%, transparent) 0 0.75rem, transparent 0.78rem)",
});

export const cardFigure = css({
  fontSize: "2xl",
  fontWeight: "bold",
  fontVariantNumeric: "tabular-nums",
});

export const cardMeta = css({
  fontSize: "xs",
  opacity: 0.86,
  mt: "2px",
  fontVariantNumeric: "tabular-nums",
});

export const cardSheen = css({
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  pointerEvents: "none",
  background:
    "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--card-ink) 22%, transparent) 0%, transparent 55%)",
});

/** Paper: payslip, till receipt and the two statements, on the paper material. */
export const paper = cva({
  base: {
    position: "relative",
    display: "grid",
    alignContent: "start",
    gap: "10px",
    padding: "4",
    color: "text.primary",
    background:
      "repeating-linear-gradient(0deg, {colors.material.paper.rule} 0 1px, transparent 1px 4px), {colors.material.paper.fill}",
    boxShadow:
      "inset 0 0 0 1px {colors.material.paper.edge}, 0 20px 32px -18px color-mix(in oklab, {colors.text.primary} 45%, transparent)",
    borderRadius: "xs",
  },
  variants: {
    kind: {
      // A tear-off line under a perforated top.
      payslip: {
        width: "14rem",
        pt: "6",
        _before: {
          content: '""',
          position: "absolute",
          left: "14px",
          right: "14px",
          top: "14px",
          borderTopWidth: "1px",
          borderTopStyle: "dashed",
          borderTopColor: "border.strong",
        },
      },
      // A narrow till roll with a dotted foot.
      receipt: {
        width: "12rem",
        pb: "6",
        background:
          "repeating-linear-gradient(0deg, {colors.material.paper.rule} 0 1px, transparent 1px 3px), {colors.surface.sunken}",
        borderRadius: "0",
        borderBottomWidth: "3px",
        borderBottomStyle: "dotted",
        borderBottomColor: "border",
      },
      statement: { width: "15rem" },
    },
  },
});

export const paperHead = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});

export const paperTitle = css({ fontFamily: "heading", fontSize: "sm", fontWeight: "bold" });

export const letterhead = css({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  pb: "10px",
  borderBottomWidth: "2px",
  borderBottomStyle: "solid",
  borderBottomColor: "primary",
});

export const letterheadMark = css({
  flex: "none",
  width: "6",
  height: "6",
  borderRadius: "full",
  background:
    "radial-gradient(circle at 35% 30%, {colors.primary.markLit}, {colors.primary.mark} 70%)",
});

export const letterheadLines = css({
  flex: "1",
  display: "grid",
  gap: "1",
  "& > i": {
    display: "block",
    height: "1",
    borderRadius: "full",
    background: "color-mix(in oklab, {colors.text.secondary} 30%, transparent)",
  },
  "& > i + i": { width: "60%" },
});

export const pieceRows = css({
  margin: 0,
  display: "grid",
  gap: "6px",
  fontSize: "xs",
  fontVariantNumeric: "tabular-nums",
  "& > div": {
    display: "flex",
    justifyContent: "space-between",
    gap: "4",
    pb: "6px",
    borderBottomWidth: "1px",
    borderBottomStyle: "dashed",
    borderBottomColor: "border",
  },
  "& dt": { color: "text.secondary" },
  "& dd": { margin: 0, fontWeight: "semibold", whiteSpace: "nowrap" },
  "& > div:last-child": { borderBottomWidth: 0 },
});

export const pieceRowTotal = css({
  "& dt": { color: "text.primary", fontWeight: "semibold" },
  "& dd": { fontSize: "md", fontWeight: "bold" },
});
