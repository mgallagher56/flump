import { describe, expect, it } from "vitest";
import { getTaxFeatureVerification } from "./tax-year-verification.js";
import { selectUkWhatIfVectors, type UkWhatIfVector } from "./test-vectors/uk-whatif.vectors.js";
import { SUPPORTED_UK_TAX_YEARS, type UkStudentLoanPlan, type UkTaxRegion } from "./types.js";
import {
  computeUkTakeHome,
  salarySacrificeCapExtraNi,
  type UkIncomeScenario,
  type UkPensionMethod,
} from "./uk-take-home.js";
import { calculateUkTax, toStudentLoanPlanKey } from "./uk-tax.js";
import {
  getUkTaxYearRules,
  type UkStudentLoanPlanKey,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year.js";
import { whatIfGrossChange } from "./uk-what-if.js";

const plansOf = (joined: unknown): UkStudentLoanPlanKey[] =>
  typeof joined === "string" && joined !== "" ? (joined.split("+") as UkStudentLoanPlanKey[]) : [];

function scenarioFromTakeHomeVector(v: UkWhatIfVector): UkIncomeScenario {
  const i = v.input as Record<string, unknown>;
  const method = i.pensionMethod as UkPensionMethod | "none";
  const children = Number(i.children ?? 0);
  return {
    taxYear: v.taxYear,
    region: v.region,
    salary: Number(i.salary),
    pension: method === "none" ? undefined : { method, amount: Number(i.pensionAmount) },
    studentLoans: plansOf(i.studentLoanPlans),
    childBenefit: children > 0 ? { children } : undefined,
  };
}

describe("computeUkTakeHome: E25-T2 vectors", () => {
  it.each(selectUkWhatIfVectors({ kind: "takeHome" }).map((v) => [v.id, v] as const))(
    "%s",
    (_id, v) => {
      expect(computeUkTakeHome(scenarioFromTakeHomeVector(v)).takeHome).toBeCloseTo(v.expected, 2);
    },
  );

  it.each(selectUkWhatIfVectors({ kind: "hicbc" }).map((v) => [v.id, v] as const))(
    "%s (charge through the core)",
    (_id, v) => {
      const ani = Number(v.input.adjustedNetIncome);
      const children = Number(v.input.children);
      const b = computeUkTakeHome({
        taxYear: v.taxYear,
        region: v.region,
        salary: ani,
        childBenefit: { children },
      });
      expect(b.hicbc).toBeCloseTo(v.expected, 2);
    },
  );

  it.each(selectUkWhatIfVectors({ kind: "studentLoanMulti" }).map((v) => [v.id, v] as const))(
    "%s",
    (_id, v) => {
      const b = computeUkTakeHome({
        taxYear: v.taxYear,
        region: v.region,
        salary: Number(v.input.grossIncome),
        studentLoans: plansOf(v.input.plans),
      });
      expect(b.studentLoan).toBeCloseTo(v.expected, 2);
    },
  );

  it.each(selectUkWhatIfVectors({ kind: "reliefAtSource" }).map((v) => [v.id, v] as const))(
    "%s",
    (_id, v) => {
      const b = computeUkTakeHome({
        taxYear: v.taxYear,
        region: v.region,
        salary: Number(v.input.grossIncome),
        pension: { method: "relief-at-source", amount: Number(v.input.netContribution) },
      });
      expect(b.incomeTax).toBeCloseTo(v.expected, 2);
    },
  );

  it.each(
    [
      ...selectUkWhatIfVectors({ kind: "whatIfDelta" }),
      ...selectUkWhatIfVectors({ kind: "scottishMarginal" }),
    ].map((v) => [v.id, v] as const),
  )("%s", (_id, v) => {
    const children = Number(v.input.children ?? 0);
    const r = whatIfGrossChange(
      {
        taxYear: v.taxYear,
        region: v.region,
        salary: Number(v.input.salary),
        childBenefit: children > 0 ? { children } : undefined,
      },
      Number(v.input.deltaGross),
    );
    expect(r.deltaTakeHome).toBeCloseTo(v.expected, 2);
  });

  it.each(selectUkWhatIfVectors({ kind: "salarySacrificeCap2029" }).map((v) => [v.id, v] as const))(
    "%s",
    (_id, v) => {
      const extra = salarySacrificeCapExtraNi(
        Number(v.input.salary),
        Number(v.input.sacrifice),
        getUkTaxYearRules(v.taxYear as (typeof SUPPORTED_UK_TAX_YEARS)[number]),
      );
      expect(v.input.party === "employer" ? extra.employer : extra.employee).toBeCloseTo(
        v.expected,
        2,
      );
    },
  );
});

describe("computeUkTakeHome: differential against calculateUkTax", () => {
  const regions: UkTaxRegion[] = ["ENGLAND_NI_WALES", "SCOTLAND"];
  const loanPlans: UkStudentLoanPlan[] = [
    "NONE",
    "PLAN_1",
    "PLAN_2",
    "PLAN_4",
    "PLAN_5",
    "POSTGRAD",
  ];

  it("agrees on every shared input, every year, region, plan and pension method (GBP0 to GBP200k)", {
    timeout: 60_000,
  }, () => {
    let compared = 0;
    for (const taxYear of SUPPORTED_UK_TAX_YEARS) {
      const rules = getUkTaxYearRules(taxYear);
      for (const region of regions) {
        for (const plan of loanPlans) {
          const key = toStudentLoanPlanKey(plan);
          if (key && !rules.studentLoans.plans[key]) continue;
          for (const isSalarySacrifice of [false, true]) {
            for (let gross = 0; gross <= 200_000; gross += 2_500) {
              const pct = (gross / 2_500) % 3 === 0 ? 0 : 5;
              const bonus = (gross / 2_500) % 4 === 0 ? 3_000 : 0;
              const old = calculateUkTax({
                grossSalary: gross,
                bonusOrSideIncome: bonus,
                pensionContributionPct: pct,
                isSalarySacrifice,
                studentLoanPlan: plan,
                region,
                taxYear,
              });
              const core = computeUkTakeHome({
                taxYear,
                region,
                salary: gross,
                bonus,
                pension: { method: isSalarySacrifice ? "salary-sacrifice" : "net-pay", pct },
                studentLoans: key ? [key] : [],
              });
              const at = `${taxYear} ${region} ${plan} ss=${isSalarySacrifice} ${gross}`;
              expect(core.takeHome, at).toBeCloseTo(old.netTakeHomePayAnnualGbp, 2);
              expect(core.incomeTax, at).toBe(old.incomeTaxGbp);
              expect(core.nationalInsurance, at).toBe(old.nationalInsuranceGbp);
              expect(core.studentLoan, at).toBe(old.studentLoanDeductionGbp);
              expect(core.adjustedNetIncome, at).toBe(old.adjustedNetIncomeGbp);
              compared += 1;
            }
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(10_000);
  });
});

describe("computeUkTakeHome: behaviour", () => {
  const base: UkIncomeScenario = { taxYear: "2026/27", region: "ENGLAND_NI_WALES", salary: 39000 };

  it("take-home is gross less every deduction", () => {
    const b = computeUkTakeHome({
      ...base,
      salary: 70000,
      pension: { method: "net-pay", pct: 5 },
      studentLoans: ["plan2"],
      childBenefit: { children: 2 },
    });
    expect(b.takeHome).toBeCloseTo(
      b.grossPay - b.pensionEmployee - b.incomeTax - b.nationalInsurance - b.studentLoan - b.hicbc,
      2,
    );
  });

  it("labels an assumed region and never claims a verified estimate today", () => {
    const b = computeUkTakeHome({ salary: 39000, taxYear: "2026/27" });
    expect(b.region).toBe("ENGLAND_NI_WALES");
    expect(b.assumptions.map((a) => a.code)).toContain("regionAssumed");
    expect(b.verification).toEqual({ core: "unverified", whatIf: "unverified" });
    expect(b.isUnverifiedEstimate).toBe(true);
  });

  it("verification matches getTaxFeatureVerification per feature", () => {
    const b = computeUkTakeHome({
      ...base,
      childBenefit: { children: 1 },
      scheduledRules: ["ni.salarySacrificePensionCap2029"],
    });
    for (const f of ["core", "whatIf", "hicbc", "scheduled"] as const) {
      expect(b.verification[f]).toBe(getTaxFeatureVerification("2026/27", f));
    }
  });

  it("flags unverified rule groups from the sourced registry", () => {
    // 2023/24 NI Class 1 is UNVERIFIED in the registry (directors' annual rate).
    expect(computeUkTakeHome({ ...base, taxYear: "2023/24" }).unverifiedRuleKeys).toContain(
      "niClass1",
    );
    // 2026/27 Scottish 125,140 boundary frame is UNVERIFIED.
    expect(computeUkTakeHome({ ...base, region: "SCOTLAND" }).unverifiedRuleKeys).toContain(
      "incomeTaxScotland",
    );
  });

  it("uses the fallback rates year when the clock is past the latest supported year", () => {
    const b = computeUkTakeHome({ salary: 39000 }, { now: new Date("2027-06-01T12:00:00Z") });
    expect(b.taxYear).toBe("2027/28");
    expect(b.ratesYear).toBe("2026/27");
    expect(b.isFallback).toBe(true);
  });

  it("throws for a student loan plan the year does not list, rather than substituting", () => {
    expect(() =>
      computeUkTakeHome({ ...base, taxYear: "2022/23", studentLoans: ["plan5"] }),
    ).toThrow(UnsupportedUkTaxYearError);
  });

  it("charges several undergraduate plans once over the lowest threshold, labelled UNVERIFIED", () => {
    const rules = getUkTaxYearRules("2026/27");
    const b = computeUkTakeHome({ ...base, salary: 45000, studentLoans: ["plan1", "plan2"] });
    const lowest = Math.min(
      rules.studentLoans.plans.plan1.threshold,
      rules.studentLoans.plans.plan2.threshold,
    );
    expect(b.studentLoan).toBeCloseTo((45000 - lowest) * 0.09, 2);
    expect(b.assumptions).toContainEqual({ code: "multipleUndergraduatePlans", unverified: true });
  });

  it("applies the 2029 cap only when asked, labelled as an illustration", () => {
    const s: UkIncomeScenario = {
      ...base,
      salary: 40000,
      pension: { method: "salary-sacrifice", amount: 5000 },
    };
    const plain = computeUkTakeHome(s);
    const capped = computeUkTakeHome({
      ...s,
      scheduledRules: ["ni.salarySacrificePensionCap2029"],
    });
    expect(plain.niPay).toBe(35000);
    expect(plain.assumptions.map((a) => a.code)).not.toContain("scheduledRuleIllustration");
    expect(capped.niPay).toBe(38000);
    expect(capped.nationalInsurance - plain.nationalInsurance).toBeCloseTo(240, 2);
    expect(capped.incomeTax).toBe(plain.incomeTax);
    expect(capped.assumptions).toContainEqual({
      code: "scheduledRuleIllustration",
      unverified: true,
    });
  });

  it("does not charge HICBC when the claimant is not the higher earner", () => {
    const b = computeUkTakeHome({
      ...base,
      salary: 75000,
      childBenefit: { children: 2, claimantIsHigherEarner: false },
    });
    expect(b.hicbc).toBe(0);
    expect(b.assumptions.map((a) => a.code)).toContain("hicbcPartnerNotModelled");
  });
});
