import type { MonthLineChartProps } from "./MonthLineChart";

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const monthLineChartStates = {
  falling: {
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
    points: [
      { fraction: 0, carried: false },
      { fraction: 0.4, carried: false },
      { fraction: 0.4, carried: true },
      { fraction: 1, carried: false },
    ],
  },
  flat: {
    points: [
      { fraction: 0.5, carried: false },
      { fraction: 0.5, carried: false },
    ],
  },
} satisfies Record<string, MonthLineChartProps>;
