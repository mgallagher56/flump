import { describe, expect, it } from "vitest";
import { selectTakeHome } from "./picture/selectors/take-home.js";
import { computeUkTakeHome } from "./uk-take-home.js";
import { calculateUkTax } from "./uk-tax.js";

/**
 * calculateUkTax is an adapter over computeUkTakeHome (E25-T5). Hand-worked 2026/27 figures for
 * England, Wales and NI: personal allowance 12,570; basic rate 20% on the next 37,700; higher 40%.
 * Class 1 NI 8% from 12,570 to 50,270 and 2% above; Class 4 NI 6% and 2% over the same limits.
 */
const Y = "2026/27" as const;

describe("pension methods on a 60,000 salary paying 5% (3,000)", () => {
  const base = { grossSalary: 60000, pensionContributionPct: 5, taxYear: Y };

  it("relief at source: paid from take-home, the grossed-up 3,750 widens the basic rate band", () => {
    const r = calculateUkTax({ ...base, pensionMethod: "relief-at-source" });
    // Taxable 47,430: (37,700 + 3,750) x 20% = 8,290; 5,980 x 40% = 2,392. Income Tax 10,682.
    expect(r.incomeTaxGbp).toBe(10682);
    // Class 1 on the full 60,000: 37,700 x 8% + 9,730 x 2% = 3,210.60.
    expect(r.nationalInsuranceGbp).toBe(3210.6);
    expect(r.employeePensionDeductionGbp).toBe(3000);
    expect(r.netTakeHomePayAnnualGbp).toBe(43107.4);
    // What reaches the pot counts towards the annual allowance: 3,000 x 1.25.
    expect(r.allowances.pensionAllowanceUsedGbp).toBe(3750);
  });

  it("net pay: taken before Income Tax, Class 1 on the full salary", () => {
    const r = calculateUkTax({ ...base, pensionMethod: "net-pay" });
    // Taxable 44,430: 7,540 + 6,730 x 40% = 10,232.
    expect(r.incomeTaxGbp).toBe(10232);
    expect(r.nationalInsuranceGbp).toBe(3210.6);
    expect(r.netTakeHomePayAnnualGbp).toBe(43557.4);
  });

  it("salary sacrifice: Income Tax as net pay, Class 1 on 57,000", () => {
    const r = calculateUkTax({ ...base, pensionMethod: "salary-sacrifice" });
    expect(r.incomeTaxGbp).toBe(10232);
    // 37,700 x 8% + 6,730 x 2% = 3,150.60.
    expect(r.nationalInsuranceGbp).toBe(3150.6);
    expect(r.netTakeHomePayAnnualGbp).toBe(43617.4);
  });

  it("isSalarySacrifice still picks between salary sacrifice and net pay when no method is given", () => {
    expect(calculateUkTax({ ...base, isSalarySacrifice: true }).netTakeHomePayAnnualGbp).toBe(
      43617.4,
    );
    expect(calculateUkTax({ ...base }).netTakeHomePayAnnualGbp).toBe(43557.4);
  });

  it("gives the three methods three different take-home figures", () => {
    const figures = (["relief-at-source", "net-pay", "salary-sacrifice"] as const).map(
      (pensionMethod) => calculateUkTax({ ...base, pensionMethod }).netTakeHomePayAnnualGbp,
    );
    expect(new Set(figures).size).toBe(3);
  });
});

describe("National Insurance class", () => {
  it("an employee pays Class 1: 3,210.60 on 60,000", () => {
    const r = calculateUkTax({ grossSalary: 60000, taxYear: Y });
    expect(r.nationalInsuranceGbp).toBe(3210.6);
    // Income Tax: 47,430 taxable; 7,540 + 9,730 x 40% = 11,432.
    expect(r.netTakeHomePayAnnualGbp).toBe(45357.4);
  });

  it("self-employed profit pays Class 4, with the 2% rate above the upper limit", () => {
    const r = calculateUkTax({ grossSalary: 60000, selfEmployed: true, taxYear: Y });
    // 37,700 x 6% = 2,262; 9,730 x 2% = 194.60. Class 4 2,456.60.
    expect(r.nationalInsuranceGbp).toBe(2456.6);
    expect(r.incomeTaxGbp).toBe(11432);
    expect(r.netTakeHomePayAnnualGbp).toBe(46111.4);
  });

  it("the take-home selector gives the same self-employed figure", () => {
    const t = selectTakeHome(
      {
        annualSalary: 60000,
        employmentType: "self-employed",
        taxRegion: "ENGLAND",
        studentLoanPlans: [],
        pensionPercent: 0,
        isSalarySacrifice: null,
      },
      { taxYear: Y },
    );
    expect(t.status === "known" && t.value.nationalInsurance).toBe(2456.6);
    expect(t.status === "known" && t.value.annual).toBe(46111);
  });
});

describe("the adapter and the core", () => {
  it("other income is taxed with the pay and carries no National Insurance", () => {
    const r = calculateUkTax({ grossSalary: 30000, netBtlProfitGbp: 10000, taxYear: Y });
    // Income Tax (40,000 - 12,570) x 20% = 5,486. Class 1 on 30,000: 17,430 x 8% = 1,394.40.
    expect(r.incomeTaxGbp).toBe(5486);
    expect(r.nationalInsuranceGbp).toBe(1394.4);
    expect(r.netTakeHomePayAnnualGbp).toBe(33119.6);
  });

  it("every figure the adapter returns is the core's figure", () => {
    const input = {
      grossSalary: 72000,
      bonusOrSideIncome: 4000,
      pensionContributionPct: 6,
      pensionMethod: "relief-at-source" as const,
      studentLoanPlan: "PLAN_2" as const,
      giftAidContributionsGbp: 400,
      taxYear: Y,
    };
    const adapter = calculateUkTax(input);
    const core = computeUkTakeHome({
      taxYear: Y,
      salary: 72000,
      bonus: 4000,
      pension: { method: "relief-at-source", pct: 6 },
      studentLoans: ["plan2"],
      giftAidNet: 400,
    });
    expect(adapter.incomeTaxGbp).toBe(core.incomeTax);
    expect(adapter.nationalInsuranceGbp).toBe(core.nationalInsurance);
    expect(adapter.studentLoanDeductionGbp).toBe(core.studentLoan);
    expect(adapter.employeePensionDeductionGbp).toBe(core.pensionEmployee);
    expect(adapter.netTakeHomePayAnnualGbp).toBe(core.takeHome);
    expect(adapter.adjustedNetIncomeGbp).toBe(core.adjustedNetIncome);
  });
});
