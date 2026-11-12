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
  sand: css({ fill: "surface.sunken" }),
  apricot: css({ fill: "chart.debt" }),
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
