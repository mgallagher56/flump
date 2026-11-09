import { describe, expect, it } from "vitest";
import { calculateForecast } from "./forecast.js";

describe("forecast module", () => {
  it("projects 30-year compound growth baseline accurately", () => {
    const res = calculateForecast({
      currentAge: 32,
      initialCashGbp: 10000,
      initialIsaGbp: 25000,
      initialPensionGbp: 45000,
      initialDebtGbp: 0,
      monthlySavingsGbp: 600,
      monthlyPensionContributionGbp: 400,
      projectionYears: 30,
    });

    expect(res.startingNetWorthGbp).toBe(80000);
    expect(res.trajectory.length).toBe(31);
    expect(res.tenYearNetWorthBaselineGbp).toBeGreaterThan(80000);
    expect(res.thirtyYearNetWorthBaselineGbp).toBeGreaterThan(res.tenYearNetWorthBaselineGbp);
  });

  it("incorporates Life Event Scenarios (e.g. Buy Home, Have Child)", () => {
    const res = calculateForecast({
      currentAge: 30,
      initialCashGbp: 30000,
      initialIsaGbp: 20000,
      monthlySavingsGbp: 800,
      scenarios: [
        {
          id: "sc-1",
          type: "BUY_HOME",
          title: "Buy First Home",
          startYear: 3,
          lumpSumCostGbp: 35000,
          ongoingMonthlyDeltaGbp: 300,
        },
      ],
      projectionYears: 20,
    });

    const year4 = res.trajectory[4]!;
    // Scenario net worth should reflect the property equity
    expect(year4.propertyEquityGbp).toBeGreaterThan(0);
  });
});
