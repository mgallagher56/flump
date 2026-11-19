import { describe, expect, it } from "vitest";
import { calculateCompoundTrajectory, calculateForecast } from "./forecast.js";

// Every growth rate set to zero so each year's figures can be worked out by addition alone.
const zeroRates = {
  annualCashInterestPct: 0,
  annualIsaReturnPct: 0,
  annualPensionReturnPct: 0,
  annualPropertyGrowthPct: 0,
};

describe("calculateForecast starting point", () => {
  it("starts at age 30 when no age is given and adds one year per point", () => {
    const res = calculateForecast({ projectionYears: 2, ...zeroRates });
    // Default age 30; year 1 is 30 + 1 = 31, year 2 is 30 + 2 = 32.
    expect(res.trajectory.map((p) => p.age)).toEqual([30, 31, 32]);
  });

  it("records every starting balance on the year 0 point", () => {
    const res = calculateForecast({
      currentAge: 40,
      initialCashGbp: 1000,
      initialIsaGbp: 2000,
      initialPensionGbp: 3000,
      initialDebtGbp: 500,
      initialPropertyEquityGbp: 10000,
      projectionYears: 0,
      ...zeroRates,
    });
    // Net worth = 1,000 + 2,000 + 3,000 + 10,000 - 500 = 15,500.
    expect(res.trajectory[0]).toEqual({
      year: 0,
      age: 40,
      baselineNetWorthGbp: 15500,
      scenarioNetWorthGbp: 15500,
      isaBalanceGbp: 2000,
      pensionBalanceGbp: 3000,
      cashBalanceGbp: 1000,
      debtBalanceGbp: 500,
      propertyEquityGbp: 10000,
    });
    expect(res.startingNetWorthGbp).toBe(15500);
  });

  it("treats negative property equity as zero", () => {
    const res = calculateForecast({
      initialPropertyEquityGbp: -5000,
      projectionYears: 0,
      ...zeroRates,
    });
    expect(res.startingNetWorthGbp).toBe(0);
    expect(res.trajectory[0]!.propertyEquityGbp).toBe(0);
  });
});

describe("calculateForecast property growth", () => {
  it("grows property equity by the default 2.5% a year in both lines", () => {
    const res = calculateForecast({
      initialPropertyEquityGbp: 100000,
      annualCashInterestPct: 0,
      annualIsaReturnPct: 0,
      annualPensionReturnPct: 0,
      projectionYears: 1,
    });
    // 100,000 * 1.025 = 102,500, the only thing owned.
    const p = res.trajectory[1]!;
    expect(p.baselineNetWorthGbp).toBe(102500);
    expect(p.scenarioNetWorthGbp).toBe(102500);
    expect(p.propertyEquityGbp).toBe(102500);
  });
});

describe("calculateForecast savings over the ISA cap", () => {
  it("puts savings above £20,000 a year into cash in both lines", () => {
    const res = calculateForecast({
      monthlySavingsGbp: 2000,
      projectionYears: 1,
      ...zeroRates,
    });
    // 2,000 * 12 = 24,000 saved: 20,000 to the ISA, 24,000 - 20,000 = 4,000 to cash.
    const p = res.trajectory[1]!;
    expect(p.baselineNetWorthGbp).toBe(24000);
    expect(p.isaBalanceGbp).toBe(20000);
    expect(p.cashBalanceGbp).toBe(4000);
  });
});

describe("calculateForecast scenario timing", () => {
  it("applies an ongoing cost only in the years the event runs", () => {
    const res = calculateForecast({
      initialCashGbp: 10000,
      scenarios: [
        {
          id: "c",
          type: "HAVE_CHILD",
          title: "Childcare",
          startYear: 2,
          durationYears: 2,
          ongoingMonthlyDeltaGbp: 100,
        },
      ],
      projectionYears: 4,
      ...zeroRates,
    });
    // Event runs in years 2 and 3 (start 2, two years). Each costs 100 * 12 = 1,200 from cash.
    // Year 1: 10,000. Year 2: 8,800. Year 3: 7,600. Year 4: no cost, stays 7,600.
    expect(res.trajectory.map((p) => p.cashBalanceGbp)).toEqual([10000, 10000, 8800, 7600, 7600]);
  });

  it("takes a lump sum once, in the start year, and does not turn it into property", () => {
    const res = calculateForecast({
      initialCashGbp: 10000,
      scenarios: [
        {
          id: "l",
          type: "HAVE_CHILD",
          title: "Nursery fit-out",
          startYear: 2,
          lumpSumCostGbp: 3000,
          ongoingMonthlyDeltaGbp: 0,
        },
      ],
      projectionYears: 3,
      ...zeroRates,
    });
    // Year 1: untouched 10,000. Year 2: 10,000 - 3,000 = 7,000. Year 3: still 7,000.
    expect(res.trajectory.map((p) => p.cashBalanceGbp)).toEqual([10000, 10000, 7000, 7000]);
    // Not a home purchase, so nothing becomes property equity and net worth falls by 3,000.
    expect(res.trajectory[2]!.propertyEquityGbp).toBe(0);
    expect(res.trajectory[2]!.scenarioNetWorthGbp).toBe(7000);
  });

  it("draws a lump sum from cash first, then the ISA for the rest", () => {
    const res = calculateForecast({
      initialCashGbp: 1000,
      initialIsaGbp: 5000,
      scenarios: [
        {
          id: "l",
          type: "HAVE_CHILD",
          title: "Cost",
          startYear: 1,
          lumpSumCostGbp: 3000,
          ongoingMonthlyDeltaGbp: 0,
        },
      ],
      projectionYears: 1,
      ...zeroRates,
    });
    // 3,000: 1,000 from cash, the other 2,000 from the ISA (5,000 -> 3,000). No debt.
    const p = res.trajectory[1]!;
    expect(p.cashBalanceGbp).toBe(0);
    expect(p.isaBalanceGbp).toBe(3000);
    expect(p.debtBalanceGbp).toBe(0);
  });

  it("pays scenario debt from savings before investing what is left", () => {
    const res = calculateForecast({
      initialDebtGbp: 1000,
      monthlySavingsGbp: 100,
      projectionYears: 1,
      ...zeroRates,
    });
    // 100 * 12 = 1,200 saved: 1,000 clears the debt, the other 200 goes to the ISA.
    const p = res.trajectory[1]!;
    expect(p.debtBalanceGbp).toBe(0);
    expect(p.isaBalanceGbp).toBe(200);
    expect(p.scenarioNetWorthGbp).toBe(200);
  });
});

describe("calculateCompoundTrajectory growth", () => {
  it("compounds monthly at the annual rate divided by 12", () => {
    const res = calculateCompoundTrajectory(1200, 0, 12, 1);
    // 12% a year = 1% a month. 1.01^12 = 1.12682503; 1,200 * 1.12682503 = 1,352.19 -> 1,352.
    // Interest = 1,352.19 - 1,200 = 152.19 -> 152.
    expect(res.endBalance).toBe(1352);
    expect(res.totalContributions).toBe(1200);
    expect(res.totalInterest).toBe(152);
    expect(res.points[1]).toEqual({ year: 1, contributions: 1200, interest: 152, total: 1352 });
  });
});
