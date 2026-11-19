import { describe, expect, it } from "vitest";
import {
  availableStudentLoanPlans,
  computeUkTakeHome,
  salarySacrificeCapExtraNi,
  type UkIncomeScenario,
} from "./uk-take-home.js";
import { getUkTaxYearRules, UnsupportedUkTaxYearError } from "./uk-tax-year.js";

const base: UkIncomeScenario = { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 39_000 };
const annual = { code: "annualMethod", unverified: false };
const assumptionsOf = (s: UkIncomeScenario) => computeUkTakeHome(s).assumptions;

describe("computeUkTakeHome: the assumptions each result lists", () => {
  it("lists only the annual method for a plain employee with a stated region", () => {
    const b = computeUkTakeHome(base);
    expect(b.assumptions).toEqual([annual]);
    expect(b.niClass).toBe("class1");
    expect(b.isFallback).toBe(false);
  });

  it("labels an assumed region as a verified assumption", () => {
    expect(assumptionsOf({ taxYear: "2026/27", salary: 39_000 })).toEqual([
      annual,
      { code: "regionAssumed", unverified: false },
    ]);
  });

  it("takes a self-employed salary sacrifice as net pay, labelled UNVERIFIED", () => {
    const s: UkIncomeScenario = {
      ...base,
      selfEmployed: true,
      pension: { method: "salary-sacrifice", pct: 5 },
    };
    const b = computeUkTakeHome(s);
    expect(b.pensionMethod).toBe("net-pay");
    expect(b.niClass).toBe("class4");
    expect(b.assumptions).toEqual([
      annual,
      { code: "pensionMethodAssumed", unverified: true },
      { code: "pensionPctOfSalary", unverified: false },
    ]);
  });

  it("keeps an employee's salary sacrifice as salary sacrifice", () => {
    const b = computeUkTakeHome({ ...base, pension: { method: "salary-sacrifice", pct: 5 } });
    expect(b.pensionMethod).toBe("salary-sacrifice");
    expect(b.assumptions).toEqual([annual, { code: "pensionPctOfSalary", unverified: false }]);
  });

  it("does not label an employee's net pay contribution as an assumed method", () => {
    expect(assumptionsOf({ ...base, pension: { method: "net-pay", pct: 5 } })).toEqual([
      annual,
      { code: "pensionPctOfSalary", unverified: false },
    ]);
  });

  it("does not label a self-employed relief at source contribution as an assumed method", () => {
    expect(
      assumptionsOf({
        ...base,
        selfEmployed: true,
        pension: { method: "relief-at-source", amount: 800 },
      }),
    ).toEqual([annual, { code: "reliefAtSourceBandExtension", unverified: true }]);
  });

  it("does not label a self-employed net pay contribution of 0 as an assumed method", () => {
    expect(
      assumptionsOf({ ...base, selfEmployed: true, pension: { method: "net-pay", amount: 0 } }),
    ).toEqual([annual]);
  });

  it("labels a percentage of salary only when a percentage above 0 is used", () => {
    expect(assumptionsOf({ ...base, pension: { method: "net-pay", pct: 0 } })).toEqual([annual]);
    // An amount wins over a percentage, so the percentage is not used.
    expect(
      assumptionsOf({ ...base, pension: { method: "net-pay", amount: 1_000, pct: 5 } }),
    ).toEqual([annual]);
  });

  it("labels relief at source in Scotland separately", () => {
    const scotland = computeUkTakeHome({
      ...base,
      region: "SCOTLAND",
      pension: { method: "relief-at-source", amount: 800 },
    });
    expect(scotland.assumptions).toEqual([
      annual,
      { code: "reliefAtSourceBandExtension", unverified: true },
      { code: "reliefAtSourceScotland", unverified: true },
    ]);
    expect(
      assumptionsOf({ ...base, pension: { method: "relief-at-source", amount: 800 } }),
    ).toEqual([annual, { code: "reliefAtSourceBandExtension", unverified: true }]);
  });

  it("flags the 2029 cap's student loan gap only with a loan and a sacrifice", () => {
    const capped: UkIncomeScenario = {
      ...base,
      salary: 40_000,
      pension: { method: "salary-sacrifice", amount: 5_000 },
      scheduledRules: ["ni.salarySacrificePensionCap2029"],
    };
    const illustration = { code: "scheduledRuleIllustration", unverified: true };
    expect(assumptionsOf({ ...capped, studentLoans: ["plan2"] })).toEqual([
      annual,
      illustration,
      { code: "studentLoanUnderScheduledCap", unverified: true },
    ]);
    expect(assumptionsOf(capped)).toEqual([annual, illustration]);
    expect(
      assumptionsOf({
        ...capped,
        studentLoans: ["plan2"],
        pension: { method: "net-pay", amount: 5_000 },
      }),
    ).toEqual([annual, illustration]);
  });

  it("does not label a single undergraduate plan as several plans", () => {
    expect(assumptionsOf({ ...base, studentLoans: ["plan2"] })).toEqual([annual]);
  });

  it("lists the Child Benefit assumptions when Child Benefit is claimed", () => {
    const b = computeUkTakeHome({ ...base, childBenefit: { children: 1 } });
    expect(b.assumptions).toEqual([
      annual,
      { code: "childBenefitExcluded", unverified: false },
      { code: "childBenefitWeeks", unverified: true },
      { code: "hicbcIndividualBasis", unverified: false },
    ]);
    expect(Object.keys(b.verification)).toEqual(["core", "whatIf", "hicbc"]);
  });

  it("charges no HICBC and says the partner is not modelled when the claimant is not the higher earner", () => {
    const b = computeUkTakeHome({
      ...base,
      salary: 75_000,
      childBenefit: { children: 1, claimantIsHigherEarner: false },
    });
    expect(b.hicbc).toBe(0);
    expect(b.hicbcPercent).toBe(0);
    expect(b.assumptions).toEqual([
      annual,
      { code: "childBenefitExcluded", unverified: false },
      { code: "childBenefitWeeks", unverified: true },
      { code: "hicbcPartnerNotModelled", unverified: false },
    ]);
  });
});

describe("computeUkTakeHome: pension caps and figures", () => {
  it("lets a net pay contribution use up to the whole of gross pay, without a cap label", () => {
    // Net pay is capped at gross pay (20,000), not at gross pay / 1.25 as relief at source is.
    const b = computeUkTakeHome({
      ...base,
      salary: 20_000,
      pension: { method: "net-pay", amount: 18_000 },
    });
    expect(b.pensionEmployee).toBe(18_000);
    expect(b.pensionGross).toBe(18_000);
    expect(b.assumptions).toEqual([annual]);
  });

  it("does not label a contribution exactly equal to gross pay as capped", () => {
    const b = computeUkTakeHome({
      ...base,
      salary: 20_000,
      pension: { method: "net-pay", amount: 20_000 },
    });
    expect(b.pensionEmployee).toBe(20_000);
    expect(b.assumptions).toEqual([annual]);
  });

  it("grosses up relief at source by the basic rate", () => {
    // GOV.UK Tax on your private pension contributions (relief at source): the provider adds
    // basic-rate relief, 20% in 2026/27. Net 800 / (1 - 0.20) = 1,000 gross.
    const b = computeUkTakeHome({ ...base, pension: { method: "relief-at-source", amount: 800 } });
    expect(b.pensionEmployee).toBe(800);
    expect(b.pensionGross).toBe(1_000);
  });

  it("widens the bands by grossed-up Gift Aid", () => {
    // GOV.UK Gift Aid: a net donation is grossed up at the basic rate, 20% in 2026/27.
    // Net 800 x 1.25 = 1,000 gross, which extends the bands by 1,000.
    expect(computeUkTakeHome({ ...base, giftAidNet: 800 }).bandExtension).toBe(1_000);
  });

  it("reads a bonus that is not a number as no bonus", () => {
    expect(computeUkTakeHome({ ...base, bonus: Number.NaN }).grossPay).toBe(39_000);
  });
});

describe("computeUkTakeHome: several student loan plans", () => {
  it("charges the plan with the lowest threshold, whatever order the plans come in", () => {
    // GOV.UK Repaying your student loan, 2026/27 thresholds: Plan 1 26,900, Plan 2 29,385, 9%.
    // Lowest is Plan 1: (40,000 - 26,900) x 9% = 13,100 x 0.09 = 1,179. Plan 2 shows 0.
    const b = computeUkTakeHome({ ...base, salary: 40_000, studentLoans: ["plan2", "plan1"] });
    expect(b.studentLoan).toBe(1_179);
    expect(b.studentLoanByPlan).toEqual({ plan1: 1_179, plan2: 0 });
  });

  it("throws for any plan the year does not list, even when another plan is charged", () => {
    // 2022/23 lists no Plan 5 (it started with the 2023/24 tables), and Plan 1 has the lower threshold.
    expect(() =>
      computeUkTakeHome({ ...base, taxYear: "2022/23", studentLoans: ["plan1", "plan5"] }),
    ).toThrow(UnsupportedUkTaxYearError);
  });

  it("offers only the plans the year lists", () => {
    expect(availableStudentLoanPlans(getUkTaxYearRules("2020/21"))).toEqual([
      "plan1",
      "plan2",
      "postgrad",
    ]);
    expect(availableStudentLoanPlans(getUkTaxYearRules("2026/27"))).toEqual([
      "plan1",
      "plan2",
      "plan4",
      "plan5",
      "postgrad",
    ]);
  });
});

describe("computeUkTakeHome: unverified rule groups", () => {
  it("lists none for a plain 2026/27 employee in England, Wales and Northern Ireland", () => {
    expect(computeUkTakeHome(base).unverifiedRuleKeys).toEqual([]);
  });

  it("lists the Scottish rates in 2026/27 only for Scotland", () => {
    expect(computeUkTakeHome({ ...base, region: "SCOTLAND" }).unverifiedRuleKeys).toEqual([
      "incomeTaxScotland",
    ]);
  });

  it("lists the 2024/25 student loan tables only when a loan is repaid", () => {
    const y = { ...base, taxYear: "2024/25" };
    expect(computeUkTakeHome({ ...y, studentLoans: ["plan2"] }).unverifiedRuleKeys).toEqual([
      "studentLoan",
    ]);
    expect(computeUkTakeHome(y).unverifiedRuleKeys).toEqual([]);
  });

  it("lists the 2020/21 Child Benefit rates only when Child Benefit is claimed", () => {
    const y = { ...base, taxYear: "2020/21", salary: 30_000 };
    expect(computeUkTakeHome({ ...y, childBenefit: { children: 1 } }).unverifiedRuleKeys).toEqual([
      "childBenefit",
    ]);
    expect(computeUkTakeHome(y).unverifiedRuleKeys).toEqual([]);
  });

  it("lists the 2020/21 allowance taper only above 100,000 of adjusted net income", () => {
    // ITA 2007 s.35: the Personal Allowance tapers on adjusted net income over 100,000.
    const y = { ...base, taxYear: "2020/21" };
    expect(computeUkTakeHome({ ...y, salary: 100_000 }).unverifiedRuleKeys).toEqual([]);
    expect(computeUkTakeHome({ ...y, salary: 100_001 }).unverifiedRuleKeys).toEqual([
      "personalAllowanceTaper",
    ]);
  });
});

describe("salarySacrificeCapExtraNi: employer NI near the secondary threshold", () => {
  it("charges employer NI on the excess over the cap above the threshold", () => {
    // 2029 cap (announced, GOV.UK policy paper): sacrifice above 2,000 a year stays liable to NI.
    // Salary 10,000, sacrifice 5,000: pay after sacrifice 5,000; excess 5,000 - 2,000 = 3,000.
    // GOV.UK Rates and thresholds for employers 2026 to 2027: secondary threshold 5,000, 15%.
    // Employer: liable pay 5,000 + 3,000 = 8,000; above threshold 3,000; 3,000 x 15% = 450.
    // Employee: primary threshold 12,570 (same page); 8,000 and 5,000 are both under it, so 0.
    expect(salarySacrificeCapExtraNi(10_000, 5_000, getUkTaxYearRules("2026/27"))).toEqual({
      employee: 0,
      employer: 450,
    });
  });
});
