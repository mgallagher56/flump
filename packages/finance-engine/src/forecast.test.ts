import { describe, expect, it } from "vitest";
import { calculateCompoundTrajectory, calculateForecast } from "./forecast.js";

describe("forecast module", () => {
  // Independent derivation. Each year a pot is updated B_y = (B_{y-1} + c) * g, g = 1 + r, so
  // B_n = B0*g^n + c*g*(g^n - 1)/(g - 1) (annuity-due closed form, computed outside the engine).
  // Rates stated explicitly: cash 3%, ISA 5%, pension 6%, property 0%.
  // Cash: 10,000 start, no cash contribution (annual savings 7,200 < 20,000 ISA cap, so all to ISA).
  //   n=10: 10000*1.03^10 = 13,439.1638; n=30: 10000*1.03^30 = 24,272.6247
  // ISA: 25,000 start, c = 600*12 = 7,200 at g=1.05
  //   n=10: 135,811.2332; n=30: 610,326.2465
  // Pension: 45,000 start, c = 400*12 = 4,800 at g=1.06
  //   n=10: 147,652.0310; n=30: 660,705.1542
  // Net worth n=10: 13,439.1638 + 135,811.2332 + 147,652.0310 = 296,902.4280 -> 296,902
  // Net worth n=30: 24,272.6247 + 610,326.2465 + 660,705.1542 = 1,295,304.0255 -> 1,295,304
  it("projects 30-year compound growth baseline to exact independently derived values", () => {
    const res = calculateForecast({
      currentAge: 32,
      initialCashGbp: 10000,
      initialIsaGbp: 25000,
      initialPensionGbp: 45000,
      initialDebtGbp: 0,
      monthlySavingsGbp: 600,
      monthlyPensionContributionGbp: 400,
      annualCashInterestPct: 3,
      annualIsaReturnPct: 5,
      annualPensionReturnPct: 6,
      annualPropertyGrowthPct: 0,
      projectionYears: 30,
    });

    expect(res.startingNetWorthGbp).toBe(80000);
    expect(res.trajectory.length).toBe(31);
    expect(res.tenYearNetWorthBaselineGbp).toBe(296902);
    expect(res.thirtyYearNetWorthBaselineGbp).toBe(1295304);
    expect(res.thirtyYearNetWorthScenarioGbp).toBe(1295304);
  });

  const zeroRates = {
    annualCashInterestPct: 0,
    annualIsaReturnPct: 0,
    annualPensionReturnPct: 0,
    annualPropertyGrowthPct: 0,
  };

  it("debt 10000, saving 500/month, 0% growth: baseline year-1 net worth is -4000", () => {
    // Year 1: savings 6,000 all go to debt (payment 6,000), nothing invested. NW = 0 - 4,000.
    // Year 2: payment 4,000 clears debt, remaining 2,000 invested. NW = 2,000.
    const res = calculateForecast({
      initialDebtGbp: 10000,
      monthlySavingsGbp: 500,
      projectionYears: 2,
      ...zeroRates,
    });
    expect(res.trajectory[1]!.baselineNetWorthGbp).toBe(-4000);
    expect(res.trajectory[2]!.baselineNetWorthGbp).toBe(2000);
  });

  it("cost 800/month on 500 savings, 0% growth, no assets: scenario year-1 net worth is -3600", () => {
    // Net = 500*12 - 800*12 = -3,600, no cash or ISA to draw, so debt grows by 3,600.
    const res = calculateForecast({
      monthlySavingsGbp: 500,
      scenarios: [
        {
          id: "s",
          type: "HAVE_CHILD",
          title: "Cost",
          startYear: 1,
          ongoingMonthlyDeltaGbp: 800,
        },
      ],
      projectionYears: 1,
      ...zeroRates,
    });
    expect(res.trajectory[1]!.scenarioNetWorthGbp).toBe(-3600);
    expect(res.trajectory[1]!.debtBalanceGbp).toBe(3600);
  });

  it("scenario deficit draws cash, then ISA, then adds to debt", () => {
    // Cash 1,000, ISA 1,000, no savings, cost 400/month = 4,800 deficit.
    // Cash 1,000 -> 0, ISA 1,000 -> 0, remaining 2,800 becomes debt. NW = -2,800.
    const res = calculateForecast({
      initialCashGbp: 1000,
      initialIsaGbp: 1000,
      scenarios: [
        {
          id: "s",
          type: "HAVE_CHILD",
          title: "Cost",
          startYear: 1,
          ongoingMonthlyDeltaGbp: 400,
        },
      ],
      projectionYears: 1,
      ...zeroRates,
    });
    const p = res.trajectory[1]!;
    expect(p.cashBalanceGbp).toBe(0);
    expect(p.isaBalanceGbp).toBe(0);
    expect(p.debtBalanceGbp).toBe(2800);
    expect(p.scenarioNetWorthGbp).toBe(-2800);
  });

  it("projectionYears 5 gives tenYear values equal to trajectory[5]", () => {
    const res = calculateForecast({
      initialCashGbp: 1000,
      monthlySavingsGbp: 100,
      projectionYears: 5,
    });
    expect(res.tenYearNetWorthBaselineGbp).toBe(res.trajectory[5]!.baselineNetWorthGbp);
    expect(res.tenYearNetWorthScenarioGbp).toBe(res.trajectory[5]!.scenarioNetWorthGbp);
    expect(res.tenYearNetWorthBaselineGbp).toBeGreaterThan(0);
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
