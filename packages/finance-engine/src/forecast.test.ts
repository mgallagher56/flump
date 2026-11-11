import { describe, expect, it } from "vitest";
import { calculateCompoundTrajectory, calculateForecast } from "./forecast.js";

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

  it("incorporates Life Event Scenarios (e.g. Buy Home, Have Child) and debt", () => {
    const res = calculateForecast({
      currentAge: 30,
      initialCashGbp: 30000,
      initialIsaGbp: 20000,
      initialDebtGbp: 5000,
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
        {
          id: "sc-2",
          type: "CAREER_CHANGE",
          title: "Career break",
          startYear: 5,
          lumpSumCostGbp: 60000,
          ongoingMonthlyDeltaGbp: -200,
        },
      ],
      projectionYears: 20,
    });

    const year4 = res.trajectory[4]!;
    expect(year4.propertyEquityGbp).toBeGreaterThan(0);
  });

  it("calculates compound trajectory accurately", () => {
    const res = calculateCompoundTrajectory(10000, 500, 5, 10);
    expect(res.points.length).toBe(11);
    expect(res.points[0].total).toBe(10000);
    expect(res.endBalance).toBeGreaterThan(70000);
    expect(res.totalInterest).toBeGreaterThan(0);
    expect(res.totalContributions).toBe(10000 + 500 * 12 * 10);

    const zeroRes = calculateCompoundTrajectory(0, 0, 0, 5);
    expect(zeroRes.endBalance).toBe(0);
  });
});
