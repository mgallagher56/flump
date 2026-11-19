import { describe, expect, it } from "vitest";
import { calculateUkTax } from "./uk-tax.js";

// Every case names the 2025/26 tax year. Figures from GOV.UK Income Tax rates and Personal
// Allowances, 2025/26 (Personal Allowance 12,570; basic rate 20% on the first 37,700 of taxable
// income; higher rate 40%; additional rate 45% over 125,140; allowance tapered by 1 for every 2
// over 100,000, ITA 2007 s.35) and GOV.UK National Insurance rates 2025/26 (employee Class 1 8%
// from 12,570 to 50,270, 2% above).
const taxYear = "2025/26" as const;

describe("calculateUkTax: totals on a 30,000 salary", () => {
  it("reports the take-home, the monthly take-home and the effective rate", () => {
    const r = calculateUkTax({ grossSalary: 30000, taxYear });
    // Income tax: (30,000 - 12,570) x 20% = 17,430 x 0.2 = 3,486.
    expect(r.incomeTaxGbp).toBe(3486);
    // Class 1: (30,000 - 12,570) x 8% = 1,394.40.
    expect(r.nationalInsuranceGbp).toBe(1394.4);
    // Take-home: 30,000 - 3,486 - 1,394.40 = 25,119.60; a month is 25,119.60 / 12 = 2,093.30.
    expect(r.netTakeHomePayAnnualGbp).toBe(25119.6);
    expect(r.netTakeHomePayMonthlyGbp).toBe(2093.3);
    // Effective rate: (3,486 + 1,394.40) / 30,000 = 16.268%, to one decimal place 16.3.
    expect(r.effectiveTaxRatePct).toBe(16.3);
  });

  it("adds every deduction: income tax, NI, student loan and the pension", () => {
    // Net pay pension 5% of 30,000 = 1,500 (no salary sacrifice flag, so net pay), Plan 2.
    const r = calculateUkTax({
      grossSalary: 30000,
      pensionContributionPct: 5,
      studentLoanPlan: "PLAN_2",
      taxYear,
    });
    // Income tax on 30,000 - 1,500 = 28,500: (28,500 - 12,570) x 20% = 15,930 x 0.2 = 3,186.
    // Class 1 on the full 30,000 (net pay does not lower NI pay): 1,394.40.
    // Plan 2 at 9% over 28,470 (GOV.UK Rates and thresholds for employers 2025 to 2026), on pay
    // before a net pay pension: (30,000 - 28,470) x 9% = 137.70.
    // Total: 3,186 + 1,394.40 + 137.70 + 1,500 = 6,218.10.
    expect(r.totalDeductionsGbp).toBe(6218.1);
  });

  it("counts savings interest in gross income, taxed with the pay", () => {
    const r = calculateUkTax({ grossSalary: 30000, taxableSavingsInterestGbp: 1000, taxYear });
    // 30,000 salary + 1,000 interest = 31,000; taxable 31,000 - 12,570 = 18,430.
    expect(r.grossIncomeGbp).toBe(31000);
    expect(r.taxableIncomeGbp).toBe(18430);
  });

  it("gives an effective rate of 0 with no income rather than a division by zero", () => {
    expect(calculateUkTax({ grossSalary: 0, taxYear }).effectiveTaxRatePct).toBe(0);
  });
});

describe("calculateUkTax: the band at the top of the income, for the Personal Savings Allowance", () => {
  // Personal Savings Allowance 2025/26 (GOV.UK Tax on savings interest): 1,000 basic rate,
  // 500 higher rate, 0 additional rate.
  it("is the Personal Allowance when there is no taxable income", () => {
    // 10,000 is under the 12,570 allowance: taxable income 0.
    const r = calculateUkTax({ grossSalary: 10000, taxYear });
    expect(r.allowances.marginalIncomeTaxBand).toBe("PERSONAL_ALLOWANCE");
  });

  it("stays basic rate at exactly the top of the basic band", () => {
    // 50,270 - 12,570 = 37,700 taxable, the last basic rate pound.
    const r = calculateUkTax({ grossSalary: 50270, taxYear });
    expect(r.allowances.marginalIncomeTaxBand).toBe("BASIC");
    expect(r.allowances.personalSavingsAllowanceGbp).toBe(1000);
  });

  it("stays higher rate at exactly the additional rate threshold", () => {
    // 125,140: allowance fully tapered (12,570 - 25,140 / 2 = 0), taxable 125,140, which is not
    // over 125,140.
    const r = calculateUkTax({ grossSalary: 125140, taxYear });
    expect(r.allowances.marginalIncomeTaxBand).toBe("HIGHER");
    expect(r.allowances.personalSavingsAllowanceGbp).toBe(500);
  });

  it("widens the basic band by grossed-up Gift Aid", () => {
    // Net Gift Aid 4,000 grossed up to 5,000 extends the basic band to 42,700 (ITA 2007 s.414).
    // 52,000 - 12,570 = 39,430 taxable, inside 42,700, so basic rate.
    const r = calculateUkTax({ grossSalary: 52000, giftAidContributionsGbp: 4000, taxYear });
    expect(r.allowances.marginalIncomeTaxBand).toBe("BASIC");
    expect(r.allowances.personalSavingsAllowanceGbp).toBe(1000);
  });

  it("moves the additional rate threshold up by grossed-up Gift Aid", () => {
    // 128,000 with 5,000 grossed-up Gift Aid: adjusted net income 123,000, allowance
    // 12,570 - 23,000 / 2 = 1,070, taxable 126,930. The additional rate threshold extends to
    // 125,140 + 5,000 = 130,140, so the top of the income is higher rate.
    const r = calculateUkTax({ grossSalary: 128000, giftAidContributionsGbp: 4000, taxYear });
    expect(r.allowances.marginalIncomeTaxBand).toBe("HIGHER");
    expect(r.allowances.personalSavingsAllowanceGbp).toBe(500);
  });

  it("is additional rate for a Scottish taxpayer over 125,140", () => {
    // Scottish top rate and the UK additional rate both start over 125,140; 130,000 is above both.
    const r = calculateUkTax({ grossSalary: 130000, region: "SCOTLAND", taxYear });
    expect(r.allowances.marginalIncomeTaxBand).toBe("ADDITIONAL");
    expect(r.allowances.personalSavingsAllowanceGbp).toBe(0);
  });

  it("is not additional rate for a Scottish taxpayer at exactly 125,140", () => {
    // Income of exactly 125,140 is not over 125,140. The higher band edge itself is an open
    // ruling for Scottish taxpayers, so only the band is checked, not its lower edge.
    const r = calculateUkTax({ grossSalary: 125140, region: "SCOTLAND", taxYear });
    expect(r.allowances.marginalIncomeTaxBand).toBe("HIGHER");
  });
});

describe("calculateUkTax: pension annual allowance and employer NI", () => {
  it("counts employee and employer contributions against the 60,000 annual allowance", () => {
    // Employee 5% of 60,000 = 3,000 (salary sacrifice); employer 3% = 1,800. Used 4,800; left
    // 60,000 - 4,800 = 55,200 (GOV.UK Tax on your private pension contributions, annual allowance
    // 60,000 from 2023/24).
    const r = calculateUkTax({
      grossSalary: 60000,
      pensionContributionPct: 5,
      employerPensionMatchPct: 3,
      isSalarySacrifice: true,
      taxYear,
    });
    expect(r.allowances.pensionAllowanceUsedGbp).toBe(4800);
    expect(r.allowances.pensionAllowanceRemainingGbp).toBe(55200);
  });

  it("adds the employer NI saving only for salary sacrifice, and only when asked", () => {
    const base = { grossSalary: 60000, pensionContributionPct: 5, taxYear } as const;
    // Employer Class 1 2025/26: 15% over the 5,000 secondary threshold (GOV.UK Rates and
    // thresholds for employers 2025 to 2026). The 3,000 sacrifice all sits above it:
    // 3,000 x 15% = 450.
    expect(
      calculateUkTax({ ...base, isSalarySacrifice: true, includeEmployerNiRebate: true })
        .employerNiSavingsGbp,
    ).toBe(450);
    expect(
      calculateUkTax({ ...base, isSalarySacrifice: true, includeEmployerNiRebate: false })
        .employerNiSavingsGbp,
    ).toBe(0);
    expect(
      calculateUkTax({ ...base, pensionMethod: "net-pay", includeEmployerNiRebate: true })
        .employerNiSavingsGbp,
    ).toBe(0);
  });
});
