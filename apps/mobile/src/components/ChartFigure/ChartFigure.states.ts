import type { ChartFigureProps } from "./ChartFigure";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const chartFigureStates = {
  falling: {
    title: "Residential mortgage balance history",
    summary:
      "Down £3,300 since May 2026. The dashed end is this month's saved balance, not yet recorded.",
    endLabel: "£186,000",
    points: [
      { fraction: 1, carried: false },
      { fraction: 0.8333, carried: false },
      { fraction: 0.6667, carried: false },
      { fraction: 0.5, carried: false },
      { fraction: 0.3333, carried: false },
      { fraction: 0.1667, carried: false },
      { fraction: 0, carried: true },
    ],
  },
  withGap: {
    title: "Net worth over time",
    summary: "Up £500 since August 2026. Months with no check-in show as a dashed line.",
    endLabel: "£1,500",
    points: [
      { fraction: 0, carried: false },
      { fraction: 0.4, carried: false },
      { fraction: 0.4, carried: true },
      { fraction: 1, carried: false },
    ],
  },
  flat: {
    title: "Cash ISA balance history",
    summary: "No change since October 2026.",
    endLabel: "£10,000",
    points: [
      { fraction: 0.5, carried: false },
      { fraction: 0.5, carried: false },
    ],
  },
} satisfies Record<string, ChartFigureProps>;
