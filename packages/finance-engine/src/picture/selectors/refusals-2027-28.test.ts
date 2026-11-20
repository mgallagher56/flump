/**
 * 2027/28 refusals (owner decision: refuse, never carry forward): Scottish rates and student loan
 * Plan 1 and Plan 4 thresholds are not published. A refused figure is "not available" with the
 * notice to show; a refused loan plan is left out of the figure, which says so. Nothing throws.
 */
import { describe, expect, it } from "vitest";
import type { TaxRecord } from "../../tax-calculator.js";
import { estimateInputsFor } from "../../tax-estimate-inputs.js";
import {
  getUkTaxYearRules,
  scottishRatesNotPublishedNotice,
  scottishRatesRefusal,
  studentLoanThresholdNotPublishedNotice,
  studentLoanThresholdRefusal,
  UnsupportedUkTaxYearError,
  ukRefusalFromError,
} from "../../uk-tax-year.js";
import { figureRefused, isFigureKnown } from "../figure.js";
import type { ProfileFacts } from "../input.js";
import { selectEstimatedTaxDue } from "./estimated-tax-due.js";
import { selectMarginalRate } from "./marginal-rate.js";
import { selectPsaBand } from "./psa-band.js";
import { selectTakeHome } from "./take-home.js";

const Y = "2027/28";
const SCOTTISH_NOTICE =
  "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.";
const LOAN_NOTICE =
  "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.";

const FACTS: ProfileFacts = {
  annualSalary: 50000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
};
const SCOT: ProfileFacts = { ...FACTS, taxRegion: "SCOTLAND" };

const rent2027: TaxRecord = {
  id: "r1",
  userId: "u1",
  name: "Flat rent",
  source: "rental",
  type: "income",
  category: "rental_income",
  amount: 12000,
  frequency: "annual",
  date: "2027-06-06",
  endDate: null,
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  createdAt: "2027-06-06T00:00:00Z",
  updatedAt: "2027-06-06T00:00:00Z",
};

describe("refusal helpers", () => {
  it("word the notices as approved", () => {
    expect(scottishRatesNotPublishedNotice(Y)).toBe(SCOTTISH_NOTICE);
    expect(studentLoanThresholdNotPublishedNotice(Y)).toBe(LOAN_NOTICE);
  });

  it("refuse Scottish 2027/28 only", () => {
    const r = getUkTaxYearRules(Y);
    expect(scottishRatesRefusal(r, "SCOTLAND")).toEqual({
      kind: "scottish-rates-not-published",
      taxYear: Y,
      notice: SCOTTISH_NOTICE,
    });
    expect(scottishRatesRefusal(r, "ENGLAND_NI_WALES")).toBeNull();
    expect(scottishRatesRefusal(r, null)).toBeNull();
    expect(scottishRatesRefusal(getUkTaxYearRules("2026/27"), "SCOTLAND")).toBeNull();
  });

  it("refuse Plan 1 and Plan 4 in 2027/28 only", () => {
    const r = getUkTaxYearRules(Y);
    for (const plan of ["plan1", "plan4"] as const) {
      expect(studentLoanThresholdRefusal(r, plan)).toEqual({
        kind: "student-loan-threshold-not-published",
        taxYear: Y,
        notice: LOAN_NOTICE,
      });
      expect(studentLoanThresholdRefusal(getUkTaxYearRules("2026/27"), plan)).toBeNull();
    }
    for (const plan of ["plan2", "plan5", "postgrad"] as const) {
      expect(studentLoanThresholdRefusal(r, plan)).toBeNull();
    }
  });

  it("read the refusal behind an engine error, and nothing else", () => {
    expect(ukRefusalFromError(new UnsupportedUkTaxYearError(Y, "Scottish income tax"))).toEqual({
      kind: "scottish-rates-not-published",
      taxYear: Y,
      notice: SCOTTISH_NOTICE,
    });
    expect(ukRefusalFromError(new UnsupportedUkTaxYearError(Y, "student loan plan1"))).toEqual({
      kind: "student-loan-threshold-not-published",
      taxYear: Y,
      notice: LOAN_NOTICE,
    });
    expect(ukRefusalFromError(new UnsupportedUkTaxYearError("2029/30"))).toBeNull();
    expect(ukRefusalFromError(new UnsupportedUkTaxYearError(Y, "National Insurance"))).toBeNull();
    expect(ukRefusalFromError(new Error("Scottish income tax"))).toBeNull();
  });

  it("figureRefused is unknown, not zero, with the notice", () => {
    expect(figureRefused({ notice: SCOTTISH_NOTICE })).toEqual({
      status: "unknown",
      missing: [],
      reason: "rates-not-published",
      notice: SCOTTISH_NOTICE,
    });
  });
});

describe("selectors in 2027/28", () => {
  it("take-home: Scottish is refused with the notice", () => {
    expect(selectTakeHome(SCOT, { taxYear: Y })).toEqual(
      figureRefused({ notice: SCOTTISH_NOTICE }),
    );
  });

  it("take-home: Plan 1 and Plan 4 are left out and the figure says so", () => {
    const none = selectTakeHome(FACTS, { taxYear: Y });
    for (const plan of ["PLAN_1", "PLAN_4"]) {
      const fig = selectTakeHome({ ...FACTS, studentLoanPlans: [plan] }, { taxYear: Y });
      if (!isFigureKnown(fig) || !isFigureKnown(none)) throw new Error("expected known");
      expect(fig.value.studentLoan, plan).toBe(0);
      expect(fig.value.annual, plan).toBe(none.value.annual);
      expect(fig.assumptions, plan).toEqual([LOAN_NOTICE]);
      expect(fig.provenance, plan).toBe("assumption");
    }
    // Plan 2 is published: it is charged and no notice is added.
    const plan2 = selectTakeHome({ ...FACTS, studentLoanPlans: ["PLAN_2"] }, { taxYear: Y });
    if (!isFigureKnown(plan2)) throw new Error("expected known");
    // (50,000 - 29,385) x 9% = 1,855.35.
    expect(plan2.value.studentLoan).toBeCloseTo(1855.35, 2);
    expect(plan2.assumptions).toBeUndefined();
  });

  it("PSA band: Scottish is no band (null), England is basic", () => {
    expect(selectPsaBand(SCOT, { taxYear: Y })).toBeNull();
    // 50,000 less a 5% net-pay pension (2,500) is 47,500: under 50,270, so basic.
    expect(selectPsaBand(FACTS, { taxYear: Y })).toBe("basic");
    // 2026/27 has Scottish rates, so a band is worked out (not refused).
    expect(selectPsaBand(SCOT, { taxYear: "2026/27" })).not.toBeNull();
  });

  it("estimated tax due: Scottish is refused with the notice; England is worked out", () => {
    expect(selectEstimatedTaxDue(SCOT, [rent2027], { taxYear: Y })).toEqual(
      figureRefused({ notice: SCOTTISH_NOTICE }),
    );
    expect(isFigureKnown(selectEstimatedTaxDue(FACTS, [rent2027], { taxYear: Y }))).toBe(true);
    expect(estimateInputsFor({ ...SCOT, accounts: [] }, [rent2027], Y)).toEqual({
      status: "refused",
      refusal: { kind: "scottish-rates-not-published", taxYear: Y, notice: SCOTTISH_NOTICE },
    });
  });

  it("marginal rate: Scottish is refused; Plan 1 is left out and the figure says so", () => {
    expect(selectMarginalRate(SCOT, { taxYear: Y })).toEqual(
      figureRefused({ notice: SCOTTISH_NOTICE }),
    );
    const none = selectMarginalRate(FACTS, { taxYear: Y });
    const plan1 = selectMarginalRate({ ...FACTS, studentLoanPlans: ["PLAN_1"] }, { taxYear: Y });
    if (!isFigureKnown(plan1) || !isFigureKnown(none)) throw new Error("expected known");
    expect(plan1.value.nextThousandDeductedPct).toBe(none.value.nextThousandDeductedPct);
    expect(plan1.assumptions).toEqual([LOAN_NOTICE]);
    // Plan 1 with Plan 2: Plan 2 stays, so the 9% is still charged on the next £1,000.
    const both = selectMarginalRate(
      { ...FACTS, studentLoanPlans: ["PLAN_1", "PLAN_2"] },
      { taxYear: Y },
    );
    if (!isFigureKnown(both)) throw new Error("expected known");
    expect(both.value.nextThousandDeductedPct).toBeGreaterThan(none.value.nextThousandDeductedPct);
    expect(both.assumptions).toEqual([LOAN_NOTICE]);
  });

  it("2026/27 is untouched: Scottish and Plan 1 still worked out", () => {
    expect(isFigureKnown(selectTakeHome(SCOT, { taxYear: "2026/27" }))).toBe(true);
    const p1 = selectTakeHome({ ...FACTS, studentLoanPlans: ["PLAN_1"] }, { taxYear: "2026/27" });
    if (!isFigureKnown(p1)) throw new Error("expected known");
    // (50,000 - 26,900) x 9% = 2,079.
    expect(p1.value.studentLoan).toBeCloseTo(2079, 2);
    expect(isFigureKnown(selectMarginalRate(SCOT, { taxYear: "2026/27" }))).toBe(true);
  });
});
