// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeUkTakeHome } from "./uk-take-home.js";
import { calculateUkTax } from "./uk-tax.js";

/**
 * Whole take-home breakdowns, the vector sign-off label (`verification`) included, and whole
 * `calculateUkTax` results, pinned before the take-home core was split from the sign-off check
 * (E12 S5b). Written and run against the unsplit `uk-take-home.ts` first: the split must give the
 * same objects, field for field. The headline figures carry the working by hand; the remaining
 * fields are pinned as the unsplit code gave them.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe("computeUkTakeHome (characterisation)", () => {
  it("an employee on £36,000 with a 5% net pay pension, 2026/27", () => {
    // Pension 5% of 36,000 = 1,800, taken before tax. Taxable 36,000 - 1,800 - 12,570 = 21,630;
    // tax 21,630 x 20% = 4,326. NI on all pay: (36,000 - 12,570) x 8% = 1,874.40.
    // Take-home 36,000 - 1,800 - 4,326 - 1,874.40 = 27,999.60.
    expect(
      computeUkTakeHome({
        taxYear: "2026/27",
        region: "ENGLAND_NI_WALES",
        salary: 36000,
        pension: { method: "net-pay", pct: 5 },
      }),
    ).toEqual({
      taxYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
      region: "ENGLAND_NI_WALES",
      grossPay: 36000,
      otherIncome: 0,
      incomeBeforeAllowance: 34200,
      niClass: "class1",
      pensionEmployee: 1800,
      pensionGross: 1800,
      pensionMethod: "net-pay",
      bandExtension: 0,
      adjustedNetIncome: 34200,
      personalAllowance: 12570,
      taxableIncome: 21630,
      niPay: 36000,
      studentLoanPay: 36000,
      incomeTax: 4326,
      nationalInsurance: 1874.4,
      studentLoan: 0,
      studentLoanByPlan: {},
      childBenefit: 0,
      hicbcPercent: 0,
      hicbc: 0,
      takeHome: 27999.6,
      assumptions: [
        { code: "annualMethod", unverified: false },
        { code: "pensionPctOfSalary", unverified: false },
      ],
      unverifiedRuleKeys: [],
      verification: { core: "verified", whatIf: "verified" },
      isUnverifiedEstimate: false,
    });
  });

  it("self-employed profit of £40,000, region not given, 2026/27", () => {
    // Taxable 40,000 - 12,570 = 27,430; tax 27,430 x 20% = 5,486. Class 4 NI 27,430 x 6% =
    // 1,645.80. Take-home 40,000 - 5,486 - 1,645.80 = 32,868.20.
    expect(computeUkTakeHome({ taxYear: "2026/27", salary: 40000, selfEmployed: true })).toEqual({
      taxYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
      region: "ENGLAND_NI_WALES",
      grossPay: 40000,
      otherIncome: 0,
      incomeBeforeAllowance: 40000,
      niClass: "class4",
      pensionEmployee: 0,
      pensionGross: 0,
      pensionMethod: null,
      bandExtension: 0,
      adjustedNetIncome: 40000,
      personalAllowance: 12570,
      taxableIncome: 27430,
      niPay: 40000,
      studentLoanPay: 40000,
      incomeTax: 5486,
      nationalInsurance: 1645.8,
      studentLoan: 0,
      studentLoanByPlan: {},
      childBenefit: 0,
      hicbcPercent: 0,
      hicbc: 0,
      takeHome: 32868.2,
      assumptions: [
        { code: "annualMethod", unverified: false },
        { code: "regionAssumed", unverified: false },
      ],
      unverifiedRuleKeys: [],
      verification: { core: "verified", whatIf: "verified" },
      isUnverifiedEstimate: false,
    });
  });

  it("a Scottish taxpayer with salary sacrifice and Plan 2, 2026/27", () => {
    // Sacrifice 5% of 50,000 = 2,500, so pay for tax, NI and student loan is 47,500.
    // NI (47,500 - 12,570) x 8% = 2,794.40.
    expect(
      computeUkTakeHome({
        taxYear: "2026/27",
        region: "SCOTLAND",
        salary: 50000,
        pension: { method: "salary-sacrifice", pct: 5 },
        studentLoans: ["plan2"],
      }),
    ).toEqual({
      taxYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
      region: "SCOTLAND",
      grossPay: 50000,
      otherIncome: 0,
      incomeBeforeAllowance: 47500,
      niClass: "class1",
      pensionEmployee: 2500,
      pensionGross: 2500,
      pensionMethod: "salary-sacrifice",
      bandExtension: 0,
      adjustedNetIncome: 47500,
      personalAllowance: 12570,
      taxableIncome: 34930,
      niPay: 47500,
      studentLoanPay: 47500,
      incomeTax: 7932.05,
      nationalInsurance: 2794.4,
      studentLoan: 1630.35,
      studentLoanByPlan: { plan2: 1630.35 },
      childBenefit: 0,
      hicbcPercent: 0,
      hicbc: 0,
      takeHome: 35143.2,
      assumptions: [
        { code: "annualMethod", unverified: false },
        { code: "pensionPctOfSalary", unverified: false },
      ],
      unverifiedRuleKeys: [],
      verification: { core: "verified", whatIf: "verified" },
      isUnverifiedEstimate: false,
    });
  });

  it("Child Benefit for two children on £70,000 adds the hicbc sign-off, 2026/27", () => {
    // Taxable 70,000 - 12,570 = 57,430: basic 37,700 x 20% = 7,540, higher 19,730 x 40% =
    // 7,892, tax 15,432. Adjusted net income 70,000 is 10,000 over 60,000: a 50% charge.
    expect(
      computeUkTakeHome({
        taxYear: "2026/27",
        region: "ENGLAND_NI_WALES",
        salary: 70000,
        childBenefit: { children: 2 },
      }),
    ).toEqual({
      taxYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
      region: "ENGLAND_NI_WALES",
      grossPay: 70000,
      otherIncome: 0,
      incomeBeforeAllowance: 70000,
      niClass: "class1",
      pensionEmployee: 0,
      pensionGross: 0,
      pensionMethod: null,
      bandExtension: 0,
      adjustedNetIncome: 70000,
      personalAllowance: 12570,
      taxableIncome: 57430,
      niPay: 70000,
      studentLoanPay: 70000,
      incomeTax: 15432,
      nationalInsurance: 3410.6,
      studentLoan: 0,
      studentLoanByPlan: {},
      childBenefit: 2382.35,
      hicbcPercent: 50,
      hicbc: 1191,
      takeHome: 49966.4,
      assumptions: [
        { code: "annualMethod", unverified: false },
        { code: "childBenefitExcluded", unverified: false },
        { code: "childBenefitWeeks", unverified: true },
        { code: "hicbcIndividualBasis", unverified: false },
      ],
      unverifiedRuleKeys: [],
      verification: { core: "verified", whatIf: "verified", hicbc: "verified" },
      isUnverifiedEstimate: true,
    });
  });

  it("the 2029 salary sacrifice cap as an illustration adds the scheduled sign-off", () => {
    // Sacrifice 5,000, of which 3,000 is over the 2,000 cap and pays NI again: NI pay
    // 60,000 - 5,000 + 3,000 = 58,000.
    expect(
      computeUkTakeHome({
        taxYear: "2026/27",
        region: "ENGLAND_NI_WALES",
        salary: 60000,
        pension: { method: "salary-sacrifice", amount: 5000 },
        scheduledRules: ["ni.salarySacrificePensionCap2029"],
      }),
    ).toEqual({
      taxYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
      region: "ENGLAND_NI_WALES",
      grossPay: 60000,
      otherIncome: 0,
      incomeBeforeAllowance: 55000,
      niClass: "class1",
      pensionEmployee: 5000,
      pensionGross: 5000,
      pensionMethod: "salary-sacrifice",
      bandExtension: 0,
      adjustedNetIncome: 55000,
      personalAllowance: 12570,
      taxableIncome: 42430,
      niPay: 58000,
      studentLoanPay: 55000,
      incomeTax: 9432,
      nationalInsurance: 3170.6,
      studentLoan: 0,
      studentLoanByPlan: {},
      childBenefit: 0,
      hicbcPercent: 0,
      hicbc: 0,
      takeHome: 42397.4,
      assumptions: [
        { code: "annualMethod", unverified: false },
        { code: "scheduledRuleIllustration", unverified: true },
      ],
      unverifiedRuleKeys: [],
      verification: { core: "verified", whatIf: "verified", scheduled: "verified" },
      isUnverifiedEstimate: true,
    });
  });

  const PROVISIONAL_36K = {
    region: "ENGLAND_NI_WALES",
    grossPay: 36000,
    otherIncome: 0,
    incomeBeforeAllowance: 36000,
    niClass: "class1",
    pensionEmployee: 0,
    pensionGross: 0,
    pensionMethod: null,
    bandExtension: 0,
    adjustedNetIncome: 36000,
    personalAllowance: 12570,
    taxableIncome: 23430,
    niPay: 36000,
    studentLoanPay: 36000,
    incomeTax: 4686,
    nationalInsurance: 1874.4,
    studentLoan: 0,
    studentLoanByPlan: {},
    childBenefit: 0,
    hicbcPercent: 0,
    hicbc: 0,
    takeHome: 29439.6,
    assumptions: [{ code: "annualMethod", unverified: false }],
    unverifiedRuleKeys: [],
    // 2027/28 is provisional, so its sign-off is never "verified".
    verification: { core: "unverified", whatIf: "unverified" },
    isUnverifiedEstimate: true,
  };

  it("2027/28, a provisional year, is labelled unverified", () => {
    // Taxable 36,000 - 12,570 = 23,430; tax 4,686. NI 23,430 x 8% = 1,874.40.
    // Take-home 36,000 - 4,686 - 1,874.40 = 29,439.60.
    expect(
      computeUkTakeHome({ taxYear: "2027/28", region: "ENGLAND_NI_WALES", salary: 36000 }),
    ).toEqual({ taxYear: "2027/28", ratesYear: "2027/28", isFallback: false, ...PROVISIONAL_36K });
  });

  it("a date after the latest supported year falls back to its rates and says so", () => {
    // 1 June 2028 is in 2028/29, which the engine lacks: 2027/28 rates stand in.
    expect(
      computeUkTakeHome(
        { salary: 36000, region: "ENGLAND_NI_WALES" },
        { now: new Date("2028-06-01T12:00:00Z") },
      ),
    ).toEqual({ taxYear: "2028/29", ratesYear: "2027/28", isFallback: true, ...PROVISIONAL_36K });
  });
});

describe("calculateUkTax (characterisation)", () => {
  const TAX_TRAP_CLEAR = {
    isInTaxTrap: false,
    isNearTaxTrap: false,
    personalAllowanceTaperGbp: 0,
    effectivePersonalAllowanceGbp: 12570,
    excessOver100kGbp: 0,
    excessAbove100k: 0,
    contributionRequiredToEscapeGbp: 0,
    recommendedSacrifice: 0,
    estimatedTaxSavedByEscapingGbp: 0,
    estimatedTaxSaved: 0,
    lostPersonalAllowance: 0,
  };
  // 27 November 2026 to 5 April 2027: 4 (Nov) + 31 + 31 + 28 + 31 + 5 = 130 days.
  const ALLOWANCES_2026 = {
    isaAllowanceGbp: 20000,
    isaAllowanceUsedGbp: 0,
    isaAllowanceRemainingGbp: 20000,
    pensionAnnualAllowanceGbp: 60000,
    personalSavingsAllowanceGbp: 1000,
    marginalIncomeTaxBand: "BASIC",
    taxYearEndDate: "5 April 2027",
    daysRemainingInTaxYear: 130,
  };

  it("an employee on £36,000 with a 5% net pay pension", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));
    // As the breakdown above: tax 4,326, NI 1,874.40, pension 1,800, take-home 27,999.60.
    // Deductions 4,326 + 1,874.40 + 1,800 = 8,000.40. Monthly 27,999.60 / 12 = 2,333.30.
    // Effective rate (4,326 + 1,874.40) / 36,000 = 17.22%, to one place 17.2.
    expect(
      calculateUkTax({
        grossSalary: 36000,
        pensionContributionPct: 5,
        isSalarySacrifice: false,
        studentLoanPlan: "NONE",
        region: "ENGLAND_NI_WALES",
        taxYear: "2026/27",
      }),
    ).toEqual({
      taxYear: "2026/27",
      grossIncomeGbp: 36000,
      adjustedNetIncomeGbp: 34200,
      taxableIncomeGbp: 21630,
      incomeTaxGbp: 4326,
      nationalInsuranceGbp: 1874.4,
      studentLoanDeductionGbp: 0,
      employeePensionDeductionGbp: 1800,
      employerPensionContributionGbp: 0,
      employerNiSavingsGbp: 0,
      giftAidContributionsGbp: 0,
      totalDeductionsGbp: 8000.4,
      netTakeHomePayAnnualGbp: 27999.6,
      netTakeHomePayMonthlyGbp: 2333.3,
      effectiveTaxRatePct: 17.2,
      taxTrap: {
        ...TAX_TRAP_CLEAR,
        grossIncome: 34200,
        adjustedNetIncome: 34200,
        marginalRatePct: 20,
        effectiveMarginalRatePct: 28,
      },
      allowances: {
        ...ALLOWANCES_2026,
        pensionAllowanceUsedGbp: 1800,
        pensionAllowanceRemainingGbp: 58200,
      },
    });
  });

  it("a Scottish taxpayer with salary sacrifice, Plan 2 and the employer's NI saving", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));
    // Employer match 3% of 50,000 = 1,500. Employer NI saving 2,500 x 15% = 375.
    // Pension used 2,500 + 1,500 = 4,000, so 60,000 - 4,000 = 56,000 remains.
    expect(
      calculateUkTax({
        grossSalary: 50000,
        pensionContributionPct: 5,
        isSalarySacrifice: true,
        studentLoanPlan: "PLAN_2",
        region: "SCOTLAND",
        taxYear: "2026/27",
        employerPensionMatchPct: 3,
        includeEmployerNiRebate: true,
      }),
    ).toEqual({
      taxYear: "2026/27",
      grossIncomeGbp: 50000,
      adjustedNetIncomeGbp: 47500,
      taxableIncomeGbp: 34930,
      incomeTaxGbp: 7932.05,
      nationalInsuranceGbp: 2794.4,
      studentLoanDeductionGbp: 1630.35,
      employeePensionDeductionGbp: 2500,
      employerPensionContributionGbp: 1500,
      employerNiSavingsGbp: 375,
      giftAidContributionsGbp: 0,
      totalDeductionsGbp: 14856.8,
      netTakeHomePayAnnualGbp: 35143.2,
      netTakeHomePayMonthlyGbp: 2928.6,
      effectiveTaxRatePct: 21.5,
      taxTrap: {
        ...TAX_TRAP_CLEAR,
        grossIncome: 47500,
        adjustedNetIncome: 47500,
        marginalRatePct: 42,
        effectiveMarginalRatePct: 50,
      },
      allowances: {
        ...ALLOWANCES_2026,
        pensionAllowanceUsedGbp: 4000,
        pensionAllowanceRemainingGbp: 56000,
      },
    });
  });

  it("self-employed profit of £40,000", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));
    // As the breakdown above: tax 5,486, Class 4 NI 1,645.80, take-home 32,868.20.
    // Monthly 32,868.20 / 12 = 2,739.0166, to the penny 2,739.02.
    expect(
      calculateUkTax({
        grossSalary: 40000,
        pensionContributionPct: 0,
        selfEmployed: true,
        studentLoanPlan: "NONE",
        region: "ENGLAND_NI_WALES",
        taxYear: "2026/27",
      }),
    ).toEqual({
      taxYear: "2026/27",
      grossIncomeGbp: 40000,
      adjustedNetIncomeGbp: 40000,
      taxableIncomeGbp: 27430,
      incomeTaxGbp: 5486,
      nationalInsuranceGbp: 1645.8,
      studentLoanDeductionGbp: 0,
      employeePensionDeductionGbp: 0,
      employerPensionContributionGbp: 0,
      employerNiSavingsGbp: 0,
      giftAidContributionsGbp: 0,
      totalDeductionsGbp: 7131.8,
      netTakeHomePayAnnualGbp: 32868.2,
      netTakeHomePayMonthlyGbp: 2739.02,
      effectiveTaxRatePct: 17.8,
      taxTrap: {
        ...TAX_TRAP_CLEAR,
        grossIncome: 40000,
        adjustedNetIncome: 40000,
        marginalRatePct: 20,
        effectiveMarginalRatePct: 28,
      },
      allowances: {
        ...ALLOWANCES_2026,
        pensionAllowanceUsedGbp: 0,
        pensionAllowanceRemainingGbp: 60000,
      },
    });
  });
});
