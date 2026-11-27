import type { InfoTipProps } from "./InfoTip";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const infoTipStates = {
  closed: {
    term: "Left over each month",
    body: "The income in your budget, minus your bills, living costs and what you put aside for savings each month.",
  },
  open: {
    term: "Left over each month",
    body: "The income in your budget, minus your bills, living costs and what you put aside for savings each month.",
    initiallyOpen: true,
  },
} satisfies Record<string, InfoTipProps>;
