import { createElement } from "react";
import { NetWorthTrendBars } from "../NetWorthTrendBars";
import { netWorthTrendBarsStates } from "../NetWorthTrendBars/NetWorthTrendBars.states";
import type { HeroFigureProps } from "./HeroFigure";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const heroFigureStates = {
  default: { label: "Net worth", value: 48250, caption: "Recorded in October" },
  withoutCaption: { label: "Net worth", value: 48250 },
  notSet: { label: "Net worth", value: null, caption: null },
  debt: { label: "Net worth", value: -6400, caption: "Recorded in October" },
  changeUp: {
    label: "Net worth",
    value: 52100,
    change: { direction: "up", text: "£320 since October", spoken: "up £320 since October" },
  },
  changeDown: {
    label: "Net worth, including your home estimate",
    value: -6400,
    change: {
      direction: "down",
      text: "£1,250 since October",
      spoken: "down £1,250 since October",
    },
  },
  sameAsLastMonth: {
    label: "Net worth",
    value: 52100,
    change: { direction: "flat", text: "Same as October", spoken: "same as October" },
  },
  withBars: {
    label: "Net worth",
    value: 52100,
    change: { direction: "up", text: "£320 since October", spoken: "up £320 since October" },
    children: createElement(NetWorthTrendBars, netWorthTrendBarsStates.sevenMonths),
  },
  empty: {
    label: "Net worth",
    value: null,
    emptyPrompt: "Add an account to see your net worth.",
    emptyAction: { label: "Add an account on the website", onPress: () => {} },
  },
  signedChange: {
    label: "Net worth change",
    value: 2575,
    signed: true,
    caption: "September to October 2026.",
  },
  noEarlierMonth: {
    label: "Monthly change",
    value: null,
    notSetLabel: "No earlier month",
    emptyPrompt: "The change shows once you have two months recorded.",
  },
  loading: {
    label: "Net worth",
    value: null,
    loading: true,
    loadingLabel: "Loading your net worth",
  },
} satisfies Record<string, HeroFigureProps>;
