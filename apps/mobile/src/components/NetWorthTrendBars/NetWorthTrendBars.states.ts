import { type NetWorthTrend, selectNetWorthTrend } from "@flump/finance-engine/net-worth";
import type { NetWorthTrendBarsProps } from "./NetWorthTrendBars";

/** The engine's bars for recorded months, as Home gets them. */
function trendOf(points: readonly (readonly [string, number])[]): NetWorthTrend {
  const trend = selectNetWorthTrend(
    points.map(([month, netWorth]) => ({ month, netWorth, allCarried: false })),
  );
  if (!trend) throw new Error("A gallery trend needs three or more different months.");
  return trend;
}

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const netWorthTrendBarsStates = {
  sevenMonths: {
    trend: trendOf([
      ["2026-04", 49000],
      ["2026-05", 49600],
      ["2026-06", 50100],
      ["2026-07", 50900],
      ["2026-08", 51200],
      ["2026-09", 51780],
      ["2026-10", 52100],
    ]),
  },
  withBreak: {
    trend: trendOf([
      ["2026-06", 3000],
      ["2026-08", 3500],
      ["2026-09", 4000],
    ]),
  },
  belowZero: {
    trend: trendOf([
      ["2026-08", -3000],
      ["2026-09", -1000],
      ["2026-10", 2000],
    ]),
  },
} satisfies Record<string, NetWorthTrendBarsProps>;
