import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The hero (ROLLOUT-PLAN M1, prototype 11): under 1024px one centred column, copy then the
 * dashboard; from 1024px two columns, the copy left-aligned beside the dashboard, the pair centred
 * in the first screen under the header. Every size is reserved in the server render: the pieces
 * layer sits over the dashboard and takes no space, so nothing shifts when the assembly plays.
 */

export const hero = css({
  position: "relative",
  backgroundColor: "surface.canvas",
  px: "4",
  pt: { base: "8", md: "12" },
  pb: { base: "10", md: "12" },
  // Pieces in flight never cause a sideways scroll.
  overflowX: "clip",
  // Less top room in a short viewport (a phone in landscape), so the dashboard starts sooner.
  "@media screen and (max-height: 30rem)": { pt: "6" },
  lg: { px: "6", py: "0" },
});

/**
 * Stacked and centred under 1024px; from 1024px the two columns of prototype 11 (0.85 to 1.15),
 * 76rem at most, at least the first screen under the header tall, both columns vertically centred.
 */
export const heroInner = css({
  maxWidth: "76rem",
  mx: "auto",
  display: "grid",
  justifyItems: "center",
  gap: "7",
  lg: {
    gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
    justifyItems: "stretch",
    alignItems: "center",
    gap: "12",
    minHeight: "calc(100svh - 4rem)",
    py: "6",
  },
});

export const heroCopy = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4.5",
  textAlign: "center",
  width: "full",
  maxWidth: "3xl",
  lg: { alignItems: "flex-start", textAlign: "left" },
});

export const heroHeading = css({
  textStyle: "display",
  color: "text.primary",
  margin: 0,
  textWrap: "balance",
});

export const heroLead = css({
  textStyle: "body.lg",
  color: "text.secondary",
  margin: 0,
  maxWidth: "34ch",
});

/** The scroll cue, quiet, under the calls to action. */
export const heroAside = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: "2",
  mt: "1",
  lg: { justifyContent: "flex-start" },
});

export const scrollCue = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  px: "3.5",
  py: "2",
  borderRadius: "full",
  textStyle: "label.md",
  color: "text.secondary",
  textDecoration: "none",
  transitionProperty: "color, opacity",
  transitionDuration: "marketing.hover",
  transitionTimingFunction: "marketing.calm",
  _hover: { color: "text.primary" },
  // Gone once the page has scrolled (prototype 11's `ScrollCue`), back on keyboard focus.
  "&[data-scrolled=true]": { opacity: "0", pointerEvents: "none" },
  _focusVisible: {
    opacity: "1",
    outline: "2px solid",
    outlineColor: "border.focusRing",
    outlineOffset: "2px",
  },
});

/** The dashboard's column: stacked, it grows with the screen up to 46rem, centred; beside the copy, 40rem. */
export const stage = css({
  position: "relative",
  width: "full",
  maxWidth: "min(100%, 46rem)",
  mx: "auto",
  lg: { maxWidth: "40rem" },
});

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

/**
 * The lock's sweep of light (prototype 11's `p11-dash__glint`): a faint mint band that crosses the
 * finished dashboard once as the last piece lands. Its own clip, so the dashboard itself is not
 * clipped. Invisible at rest, so the server HTML, no JavaScript and reduced motion never show it.
 */
export const glintClip = css({
  position: "absolute",
  inset: "0",
  overflow: "hidden",
  borderRadius: "inherit",
  pointerEvents: "none",
});

export const glint = css({
  position: "absolute",
  inset: "0",
  opacity: "0",
  backgroundImage:
    "linear-gradient(104deg, transparent 38%, color-mix(in oklab, {colors.primary} 16%, transparent) 50%, transparent 62%)",
});

export const dashHead = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});

export const dashTitle = css({ textStyle: "heading.sm", color: "text.primary", margin: 0 });

/**
 * Net worth across the top, then the two tiles side by side; under the `md` width (768px) one per row,
 * so "About 10.2 months" stays on one line (PR 975 review).
 */
export const dashTiles = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  md: { gridTemplateColumns: "1fr 1fr" },
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
  // One column stacked (the pieces rest in a tray over it); two once the hero is side by side.
  gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
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

/**
 * The receipt's "left over" figure (prototype 11's `p11-ghost`): it shows as the receipt leaves,
 * lifts off and lands on the dashboard tile's figure, then gives way to it. Placed like a piece,
 * its top-left on the stage's centre until the run centres it. Invisible at rest.
 */
export const ghost = css({
  position: "absolute",
  left: "50%",
  top: "50%",
  fontSize: "md",
  fontWeight: "bold",
  color: "text.primary",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
  opacity: "0",
  "[data-hero-live=true] &": { willChange: "transform, opacity" },
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
