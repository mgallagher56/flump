import type { HeroFigureProps } from "./HeroFigure";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const heroFigureStates = {
  default: { label: "Net worth", value: 48250, caption: "Recorded in October" },
  withoutCaption: { label: "Net worth", value: 48250 },
  notSet: { label: "Net worth", value: null, caption: null },
  debt: { label: "Net worth", value: -6400, caption: "Recorded in October" },
} satisfies Record<string, HeroFigureProps>;
