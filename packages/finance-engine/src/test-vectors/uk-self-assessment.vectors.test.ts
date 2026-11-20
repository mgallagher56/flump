import { describe, expect, it } from "vitest";
import {
  calculatePropertyProfit,
  calculateSelfAssessmentPayments,
  calculateTradingProfit,
} from "../uk-self-assessment.js";
import { getUkTaxYearRules } from "../uk-tax-year.js";
import { evaluateSignoff } from "./signoff.js";
import {
  selectUkSelfAssessmentVectors,
  UK_SELF_ASSESSMENT_VECTORS,
  type UkSelfAssessmentVector,
  type UkSelfAssessmentVectorKind,
} from "./uk-self-assessment.vectors.js";
import { UK_TAX_VECTOR_YEARS } from "./uk-tax.vectors.js";

/**
 * Signed vectors are read from `signedOffBy`; no second list of ids is kept. The hash check in
 * `evaluateSignoff` catches an edit made after signing, and fails below. The hash is unkeyed, so a
 * signature computed by hand is caught in review, by the vector diff and its baseline diff (see
 * uk-tax.vectors.test.ts). Signatures come from `bun run tax:signoff apply --signer <name>`.
 */
const GOV_URL = /^https:\/\/www\.gov\.uk\//;
const KINDS: UkSelfAssessmentVectorKind[] = [
  "tradingAllowance",
  "propertyAllowance",
  "paymentsOnAccount",
];

function evaluate(v: UkSelfAssessmentVector): number {
  const rules = getUkTaxYearRules(v.taxYear);
  const i = v.input;
  switch (v.kind) {
    case "tradingAllowance":
      return calculateTradingProfit(Number(i.income), Number(i.costs), rules).profit;
    case "propertyAllowance": {
      const share = Number(i.ownershipSharePct) / 100;
      return calculatePropertyProfit(Number(i.income) * share, Number(i.costs) * share, rules)
        .profit;
    }
    case "paymentsOnAccount":
      return calculateSelfAssessmentPayments({
        taxYear: v.taxYear,
        bill: Number(i.bill),
        taxDeductedAtSource: Number(i.taxDeductedAtSource),
      }).january.amount;
  }
}

describe("Self Assessment vector catalogue", () => {
  it("every vector cites a GOV.UK page, the date it was read, and a derivation", () => {
    for (const v of UK_SELF_ASSESSMENT_VECTORS) {
      expect(v.source, v.id).toMatch(GOV_URL);
      expect(v.sourceReadOn, v.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.derivation.length, v.id).toBeGreaterThan(20);
    }
  });

  it("every signature validates against the vector's current content", () => {
    for (const v of UK_SELF_ASSESSMENT_VECTORS) {
      expect(evaluateSignoff(v).state, v.id).toBe(v.signedOffBy === null ? "unsigned" : "signed");
    }
  });

  it("ids are unique, and UNVERIFIED vectors carry a reason at medium confidence", () => {
    const ids = UK_SELF_ASSESSMENT_VECTORS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of UK_SELF_ASSESSMENT_VECTORS) {
      if (v.status === "UNVERIFIED") {
        expect(v.unverifiedReason, v.id).toMatch(/^UNVERIFIED: /);
        expect(v.confidence, v.id).toBe("medium");
      } else {
        expect(v.unverifiedReason, v.id).toBeUndefined();
      }
    }
  });

  it("every supported year has a vector of every kind", () => {
    for (const taxYear of UK_TAX_VECTOR_YEARS) {
      for (const kind of KINDS) {
        expect(
          selectUkSelfAssessmentVectors({ taxYear, kind }).length,
          `${taxYear} ${kind}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it.each(UK_SELF_ASSESSMENT_VECTORS.map((v) => [v.id, v] as const))("%s", (_id, v) => {
    expect(evaluate(v)).toBeCloseTo(v.expected, 2);
  });
});
