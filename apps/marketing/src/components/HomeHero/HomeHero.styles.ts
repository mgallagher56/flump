import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The hero (ROLLOUT-PLAN M1, prototype 11): one centred column at every width, copy then the
 * dashboard, on the canvas band. Every size is reserved in the server render: the pieces layer
 * sits over the dashboard and takes no space, so nothing shifts when the assembly plays.
 */

export const hero = css({
  position: "relative",
  backgroundColor: "surface.canvas",
  px: "4",
  pt: { base: "12", md: "16" },
  pb: { base: "12", md: "16" },
  // Pieces in flight never cause a sideways scroll.
  overflowX: "clip",
  // Less top room in a short viewport (a phone in landscape), so the dashboard starts sooner.
  "@media screen and (max-height: 30rem)": { pt: "6" },
});

/** One centred column at every width (owner ruling 5): never a left-right split. */
export const heroInner = css({
  maxWidth: "6xl",
  mx: "auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: { base: "8", md: "10" },
});

export const heroCopy = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "5",
  textAlign: "center",
  maxWidth: "3xl",
});

export const heroHeading = css({
  textStyle: "display",
  color: "text.primary",
  margin: 0,
  textWrap: "balance",
});

export const heroLead = css({ textStyle: "body.lg", color: "text.secondary", margin: 0 });

export const ctaRow = css({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "3",
});

/** The motion control and the scroll cue, quiet, under the calls to action. */
export const heroAside = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
});

export const scrollCue = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  px: "3",
  py: "2",
  borderRadius: "full",
  textStyle: "label.md",
  color: "text.secondary",
  textDecoration: "none",
  transitionProperty: "color",
  transitionDuration: "marketing.hover",
  transitionTimingFunction: "marketing.calm",
  _hover: { color: "text.primary" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

/** The dashboard's column: grows with the screen up to 48rem, always centred. */
export const stage = css({ position: "relative", width: "full", maxWidth: "3xl", mx: "auto" });

export const scene = css({
  position: "relative",
  perspective: "1300px",
  perspectiveOrigin: "50% 40%",
});

/* ---------- The dashboard: always sharp, always in the DOM ---------- */

export const dash = css({
  position: "relative",
  margin: 0,
  display: "grid",
  gap: { base: "3", sm: "4" },
  padding: { base: "4", sm: "5" },
  borderRadius: "2xl",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border",
  backgroundColor: "surface.card",
  boxShadow: "floating",
  textAlign: "left",
});

export const dashHead = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});

export const dashTitle = css({ textStyle: "heading.sm", color: "text.primary", margin: 0 });

export const dashTiles = css({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  "& > *": { minWidth: 0 },
});

export const dashHeroTile = css({ gridColumn: "1 / -1" });

export const value = css({ position: "relative", display: "inline-block" });

export const valueText = css({ display: "inline-block", fontVariantNumeric: "tabular-nums" });

/** The empty line a figure rests on before its pieces arrive: hidden at rest. */
export const valueSlot = css({
  position: "absolute",
  left: 0,
  top: "50%",
  width: "3.2em",
  height: "0.16em",
  marginTop: "-0.08em",
  borderRadius: "full",
  background: "color-mix(in oklab, {colors.text.secondary} 40%, transparent)",
  opacity: 0,
});

export const made = css({ display: "grid", gap: "6px" });

export const madeTitle = css({ textStyle: "label.md", color: "text.secondary", margin: 0 });

export const madeList = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  columnGap: "4",
  rowGap: "2px",
  gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
});

export const madeRow = css({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "2.6rem minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  py: "1",
  pl: "2",
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: "border.subtle",
});

export const madeBar = css({
  position: "absolute",
  left: 0,
  top: "2",
  bottom: "2",
  width: "2px",
  borderRadius: "full",
  backgroundColor: "primary.solid",
  transformOrigin: "50% 0%",
});

export const madeText = css({ display: "grid", minWidth: 0 });

export const madeName = css({ textStyle: "label.md", color: "text.primary" });

export const madeDetail = css({
  textStyle: "body.sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

export const madeFigure = css({
  textStyle: "numeric.sm",
  color: "text.primary",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});

export const dashCaption = css({
  textStyle: "body.sm",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

/* ---------- The pieces: decorative, shown only while the assembly plays ---------- */

/**
 * The floating layer over the dashboard. Out of layout in the server render and with reduced motion,
 * so the first paint never lays out the six pieces (ROLLOUT-PLAN M1 notes); laid out but invisible
 * while the assembly measures them (`data-hero-ready`), then shown (`data-hero-live`).
 */
export const piecesLayer = css({
  position: "absolute",
  inset: 0,
  transformStyle: "preserve-3d",
  pointerEvents: "none",
  display: "none",
  visibility: "hidden",
  "[data-hero-ready=true] &": { display: "block" },
  "[data-hero-live=true] &": { visibility: "visible" },
});

export const piece = css({
  position: "absolute",
  left: "50%",
  top: "50%",
  transformStyle: "preserve-3d",
  fontFamily: "body",
  lineHeight: "1.2",
  "[data-hero-live=true] &": { willChange: "transform, opacity" },
});

/**
 * A card's colours as two custom properties, shared by the piece and its row's glyph. Charcoal
 * savings card and a mint-tinted credit card; in Midnight both lean towards mint so they stand off
 * the dark page. `surface.hero` stays on the HeroFigure alone.
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
      credit: {
        "--card-bg": "color-mix(in oklab, {colors.primary} 16%, {colors.surface.overlay})",
        "--card-ink": "{colors.text.primary}",
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

/* ---------- Glyphs: the pieces' small forms in the "Made from" rows ---------- */

export const glyph = cva({
  base: { display: "block", justifySelf: "center", borderRadius: "xs" },
  variants: {
    kind: {
      card: {
        width: "2.4rem",
        aspectRatio: "16 / 10",
        background: "var(--card-bg)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklab, var(--card-ink) 20%, transparent), inset 6px 6px 0 -3px color-mix(in oklab, var(--card-ink) 45%, transparent)",
      },
      document: {
        width: "1.55rem",
        aspectRatio: "14 / 12",
        background:
          "linear-gradient({colors.border.strong}, {colors.border.strong}) 4px 6px / 60% 2px no-repeat, linear-gradient({colors.border}, {colors.border}) 4px 10px / 70% 2px no-repeat, {colors.material.paper.fill}",
        boxShadow: "inset 0 0 0 1px {colors.border.strong}",
      },
      receipt: {
        width: "1.3rem",
        aspectRatio: "1 / 1",
        background:
          "linear-gradient({colors.border.strong}, {colors.border.strong}) 4px 6px / 60% 2px no-repeat, linear-gradient({colors.border}, {colors.border}) 4px 10px / 70% 2px no-repeat, {colors.surface.sunken}",
        boxShadow: "inset 0 0 0 1px {colors.border.strong}",
      },
      statement: {
        width: "1.4rem",
        aspectRatio: "13 / 15",
        borderTopWidth: "2px",
        borderTopStyle: "solid",
        borderTopColor: "primary",
        background:
          "linear-gradient({colors.border.strong}, {colors.border.strong}) 3px 6px / 60% 2px no-repeat, linear-gradient({colors.border}, {colors.border}) 3px 10px / 70% 2px no-repeat, {colors.material.paper.fill}",
        boxShadow: "inset 0 0 0 1px {colors.border.strong}",
      },
    },
  },
});
