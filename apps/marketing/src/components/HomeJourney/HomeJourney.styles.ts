import { css, cva } from "@repo/ui/styled-system/css";

/*
 * The journey (prototype 11's `p11-journey`, `journey3d.css` and the top of `stops/stops.css`): a
 * full-width canvas band holding the travelling layer, the scrim, the intro and the six stops. Its
 * custom properties set the pinned rhythm once the journey is live (`JourneyStop.styles.ts`): the
 * header's height (kept current by HomeJourney), the screen under it, and each stop's beat and
 * rest, the prototype's 40svh and 64svh times the page's 1.4 (phones: 38svh and 66svh). The lane is
 * the orb's path under each frame's content.
 */
export const journey = css({
  position: "relative",
  isolation: "isolate",
  backgroundColor: "surface.canvas",
  "--journey-head": "4.25rem",
  "--journey-screen": "calc(100svh - var(--journey-head))",
  "--journey-beat": { base: "53.2svh", md: "56svh" },
  "--journey-rest": { base: "92.4svh", md: "89.6svh" },
  "--journey-span": "calc(var(--journey-beat) + var(--journey-rest))",
  "--journey-lane": { base: "72px", md: "clamp(64px, 15svh, 150px)" },
  // `?stops=scroll` (owner, 28 Nov 2026): the cards scroll with the page and hold centred for the
  // rest, with no beat. A rest of 60svh keeps the page within about 50px of the pinned mode's
  // length at 1440 by 900 and 390 by 844.
  "&[data-stops=scroll]": { "--journey-beat": "0px", "--journey-rest": "60svh" },
});

/**
 * The still orbs at the stage's edges (prototype 11's `p11-still-orb--1..4`): the first and the
 * fourth run past the screen's edge as the prototype places them, and the stage clips them
 * (`overflow: hidden` in `SceneStage.styles.ts`), so nothing scrolls sideways. Smaller on a
 * phone, where the second is left out. Each orb sits in its own placed wrapper, which sets the
 * size the orb reads (`--orb-size`): on the orb itself, its own `position: relative` would win
 * over the placement and stack all four at the stage's top left. The stage is sticky, so the four
 * stay in place behind every stop.
 */
export const stillOrb = cva({
  base: { position: "absolute", display: "block", lineHeight: "0" },
  variants: {
    place: {
      1: { "--orb-size": { base: "4.5rem", md: "9rem" }, left: "-3rem", top: "18%" },
      2: { "--orb-size": "5rem", right: "4%", top: "9%", display: { base: "none", md: "block" } },
      3: { "--orb-size": "3.5rem", left: "46%", bottom: "5%" },
      4: { "--orb-size": { base: "4.5rem", md: "7rem" }, right: "-2rem", bottom: "14%" },
    },
  },
});

/**
 * The page colours the live scene reads back as computed colours (the orb colours it reads from
 * the still orbs). Never shown.
 */
export const swatch = cva({
  base: { display: "none" },
  variants: {
    tone: {
      canvas: { color: "surface.canvas" },
      floor: { color: { base: "text.secondary", _dark: "border.strong" } },
      ink: { color: "text.primary" },
      primary: { color: "primary" },
    },
  },
});

/**
 * The scrim layer (prototype 11's `p11-jscrim`): sticky like the stage, between the scene and the
 * stops, live only. Its two layers fade in over the scroll into the first stop.
 *
 * How far the scene recedes (STYLE-GUIDE "Receding scene"), held here once for both layers:
 * halfway between prototype 11's settings (tint 66% and 22% on Mint, 50% and 14% on Midnight;
 * `blur(5px) saturate(0.9)` and `blur(4px) saturate(1.5) brightness(1.15)`) and the sharp scene
 * (owner, 28 Nov 2026), so the orbs and the bead track still read as coloured glass while the
 * cards stay the focus.
 */
export const scrimLayer = css({
  "--recede-tint-strong": { base: "33%", _dark: "25%" },
  "--recede-tint-soft": { base: "11%", _dark: "7%" },
  "--recede-blur": { base: "2.5px", _dark: "2px" },
  "--recede-saturate": { base: "0.95", _dark: "1.25" },
  "--recede-brightness": { base: "1", _dark: "1.075" },
  position: "sticky",
  top: "0",
  height: "100svh",
  marginBottom: "-100svh",
  zIndex: "0",
  pointerEvents: "none",
  display: "none",
  "[data-live=on] > &": { display: "block" },
});

/**
 * The tint (`p11-scrim`): the canvas colour, strongest behind the pair and lighter in the orb's
 * lane at the foot, so the travelling orb stays bright while the rest of the scene recedes.
 * Midnight takes a lighter tint, so the coloured glass keeps its colour. The strengths are the
 * layer's `--recede-tint-*`.
 */
export const scrim = css({
  "--scrim-strong":
    "color-mix(in oklab, {colors.surface.canvas} var(--recede-tint-strong), transparent)",
  "--scrim-soft":
    "color-mix(in oklab, {colors.surface.canvas} var(--recede-tint-soft), transparent)",
  "--scrim-foot": "calc(100% - var(--journey-lane) - 6svh)",
  position: "absolute",
  inset: "0",
  opacity: "0",
  background:
    "linear-gradient(to bottom, var(--scrim-strong) 0, var(--scrim-strong) var(--scrim-foot), var(--scrim-soft) calc(var(--scrim-foot) + 10svh), var(--scrim-soft) 100%)",
});

/**
 * The soft blur (`p11-scrim-blur`) from 48rem, its own layer masked to the same shape: a cheap
 * depth of field behind the content, never over it.
 */
export const scrimBlur = css({
  display: "none",
  "@media (min-width: 48rem)": {
    "--scrim-foot": "calc(100% - var(--journey-lane) - 6svh)",
    display: "block",
    position: "absolute",
    inset: "0",
    opacity: "0",
    backdropFilter:
      "blur(var(--recede-blur)) saturate(var(--recede-saturate)) brightness(var(--recede-brightness))",
    maskImage:
      "linear-gradient(to bottom, {colors.text.primary} 0, {colors.text.primary} var(--scrim-foot), transparent calc(var(--scrim-foot) + 10svh))",
  },
});

/** The intro sits in the scene, over the stage. */
export const intro = css({
  position: "relative",
  zIndex: "1",
});

/** The journey's heading block (`p11-journey__head`). */
export const head = css({
  display: "grid",
  gap: "3",
  maxWidth: "76rem",
  marginInline: "auto",
  boxSizing: "border-box",
  padding: "clamp(56px, 10vh, 104px) 24px clamp(24px, 4vh, 40px)",
  "& > *": { maxWidth: "42rem", margin: "0" },
});

export const title = css({
  color: "text.primary",
  fontSize: { base: "3xl", md: "4xl", xl: "5xl" },
  fontWeight: "bold",
  lineHeight: "1.08",
  letterSpacing: "-0.025em",
  textWrap: "balance",
});

export const lead = css({
  color: "text.secondary",
  fontSize: "lg",
  lineHeight: "1.55",
});
