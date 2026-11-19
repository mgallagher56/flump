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
    },
  },
  defaultVariants: { size: "md" },
});

/** Decorative scene colours. Semantic tokens only: sand, apricot, sage and the teal family. */
export const sceneClasses = {
  // In dark the sunken sand is darker than a card, so the ground read as a hole; a shade lighter
  // than the card reads as ground on any surface (R2-8).
  sand: css({
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
  tealSoft: css({ fill: "primary.border" }),
  teal: css({ fill: "primary.solid" }),
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
    stroke: "primary.solid",
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
