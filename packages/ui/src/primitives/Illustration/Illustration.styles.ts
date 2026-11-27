import { css, cva } from "../../../styled-system/css";

export const illustrationRecipe = cva({
  base: {
    display: "block",
    width: "100%",
    height: "auto",
    flexShrink: 0,
    '& [data-scene-part="sun"]': {
      transformBox: "view-box",
    },
    '& [data-scene-part="sprout"]': {
      transformOrigin: "168px 58px",
      transformBox: "view-box",
    },
    // E17 Demo 7: scene settling once on first view
    "&[data-scene-settle]": {
      '& [data-scene-part="sun"]': {
        _motionSafe: {
          animationName: "sceneRise",
          animationDuration: "scene",
          animationTimingFunction: "settle",
          animationFillMode: "both",
        },
        _motionReduce: {
          animation: "none",
        },
      },
      '& [data-scene-part="sprout"]': {
        _motionSafe: {
          animationName: "sceneGrow",
          animationDuration: "scene",
          animationTimingFunction: "settle",
          animationFillMode: "both",
        },
        _motionReduce: {
          animation: "none",
        },
      },
    },
  },
  variants: {
    size: {
      sm: { maxWidth: "140px" },
      md: { maxWidth: "200px" },
      lg: { maxWidth: "260px" },
      // 20rem (320px): a marketing spot scene, about 2.3 times the `sm` scene it replaced.
      xl: { maxWidth: "xs" },
    },
  },
  defaultVariants: { size: "md" },
});

/**
 * Decorative scene colours. Semantic tokens only: the mint ground, apricot, sage and the teal family
 * (teal in light, mint in dark). Midnight and Mint: no cream ground and no charcoal shapes in light,
 * so the solid shapes use primary (the teal), not primary.solid (the charcoal button fill).
 */
export const sceneClasses = {
  // In dark the sunken step is darker than a card, so the ground read as a hole; a shade lighter
  // than the card reads as ground on any surface (R2-8).
  ground: css({
    fill: { base: "surface.sunken", _dark: "surface.subtle", _systemDark: "surface.subtle" },
  }),
  // The apricot sun is the brightest shape in a scene, so it is muted to a tint: about half
  // strength in light and under a third in dark. A quarter read as a loud brown disc on the
  // canvas (R2-8), but 0.15 all but vanished on a dark card (1.35:1, the halo 1.12:1); 0.3 gives
  // the disc about 1.9:1 and the halo 1.25:1 on the card and the canvas (P77).
  // fill-opacity, not opacity, so the halo's own opacity attribute still applies on top.
  apricot: css({
    fill: "chart.debt",
    fillOpacity: { base: "0.5", _dark: "0.3", _systemDark: "0.3" },
  }),
  sage: css({ fill: "chart.wealth" }),
  // A soft backdrop shape: the pale teal tint, not primary.border (now a 3:1 edge colour).
  tealSoft: css({ fill: "primary.subtle" }),
  teal: css({ fill: "primary" }),
  leaf: css({ fill: "primary" }),
  paper: css({ fill: "surface.card" }),
  accent: css({ fill: "accent" }),
  dots: css({
    stroke: "text.muted",
    fill: "none",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeDasharray: "1 9",
  }),
  stem: css({
    stroke: "chart.wealth",
    fill: "none",
    strokeWidth: "4",
    strokeLinecap: "round",
  }),
  pole: css({
    stroke: "primary",
    fill: "none",
    strokeWidth: "5",
    strokeLinecap: "round",
  }),
  tick: css({
    stroke: "primary.foreground",
    fill: "none",
    strokeWidth: "4.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  }),
};

/**
 * Document card pictures (STYLE-GUIDE 8.3). The grid is 300 wide and the picture is never drawn
 * narrower than 280px, so its smallest text (13 grid units) stays at 12px or more at any width
 * (`DOCUMENT_MIN_WIDTH` in `Illustration.documents.ts`). It grows up to the size's cap.
 */
export const documentRecipe = cva({
  base: {
    display: "block",
    width: "100%",
    minWidth: "280px",
    height: "auto",
    flexShrink: 0,
    overflow: "visible",
    // Forced colours (Windows contrast themes) ignore SVG fills, so the system pair is set here:
    // paper on Canvas with a CanvasText edge, every word in CanvasText, no shadows.
    _highContrast: {
      "& text": { fill: "CanvasText" },
      "& [data-doc-body]": { fill: "Canvas", stroke: "CanvasText" },
      "& [data-doc-tag] rect": { fill: "Canvas", stroke: "CanvasText" },
      "& [data-doc-shadow]": { display: "none" },
    },
  },
  variants: {
    size: {
      sm: { maxWidth: "280px" },
      md: { maxWidth: "xs" },
      lg: { maxWidth: "360px" },
      xl: { maxWidth: "400px" },
    },
  },
  defaultVariants: { size: "md" },
});

/** Colour roles for document pictures, mapped to the tokens in `documentRoleTokens`. */
export const documentClasses = {
  surface: {
    paper: css({ fill: "material.paper.fill" }),
    charcoal: css({ fill: "surface.contrast" }),
    mint: css({ fill: "primary.subtle" }),
    soft: css({ fill: "primary.subtle" }),
    band: css({ fill: "primary" }),
  },
  ink: {
    ink: css({ fill: "text.primary" }),
    inkSecondary: css({ fill: "text.secondary" }),
    primary: css({ fill: "primary" }),
    onCharcoal: css({ fill: "text.onContrast" }),
    onBand: css({ fill: "primary.foreground" }),
  },
  fill: {
    paper: css({ fill: "material.paper.fill" }),
    charcoal: css({ fill: "surface.contrast" }),
    mint: css({ fill: "primary.subtle" }),
    soft: css({ fill: "primary.subtle" }),
    band: css({ fill: "primary" }),
    line: css({ fill: "border" }),
    primary: css({ fill: "primary" }),
    tag: css({ fill: "surface.sunken" }),
    markOnCharcoal: css({ fill: "text.onContrast" }),
  },
  stroke: {
    edge: css({ stroke: "material.paper.edge", strokeWidth: "1" }),
    rule: css({ stroke: "border" }),
    slot: css({ stroke: "border.strong" }),
    primary: css({ stroke: "primary" }),
    onBand: css({ stroke: "primary.foreground" }),
    onCharcoal: css({ stroke: "text.onContrast", strokeOpacity: "0.5" }),
  },
  noFill: css({ fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }),
  dashed: css({ strokeDasharray: "3 3" }),
  edge: css({ stroke: "material.paper.edge", strokeWidth: "1" }),
  tornEdge: css({ stroke: "none" }),
  // A soft drop under each piece: the charcoal, faint and blurred (darker in dark, where a faint
  // shadow would vanish on the Midnight canvas).
  shadow: css({
    fill: "surface.contrast",
    fillOpacity: { base: "0.14", _dark: "0.6", _systemDark: "0.6" },
    filter: "blur(8px)",
  }),
  tagPaper: css({ fill: "surface.sunken", stroke: "border", strokeWidth: "1" }),
  tagOnCharcoal: css({ fill: "none", stroke: "text.onContrast", strokeOpacity: "0.6" }),
  display: css({ fontFamily: "display" }),
  body: css({ fontFamily: "sans" }),
  numeric: css({ fontVariantNumeric: "tabular-nums" }),
};
