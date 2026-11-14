import { css, cva } from "../../../styled-system/css";

export const illustrationRecipe = cva({
  base: { display: "block", width: "100%", height: "auto", flexShrink: 0 },
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
  // The apricot sun is the brightest shape on a dark canvas, so it is toned down there (R2-8).
  // fill-opacity, not opacity, so the halo's own opacity attribute still applies on top.
  apricot: css({
    fill: "chart.debt",
    fillOpacity: { base: "1", _dark: "0.6", _systemDark: "0.6" },
  }),
  sage: css({ fill: "chart.wealth" }),
  tealSoft: css({ fill: "primary.border" }),
  teal: css({ fill: "primary.solid" }),
  leaf: css({ fill: "primary" }),
  paper: css({ fill: "surface.card" }),
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
};
