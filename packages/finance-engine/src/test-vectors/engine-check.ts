/**
 * Engine check (E12 S1a): runs the hand-derived UK tax vectors through the engine's own functions,
 * so any JavaScript engine Flump ships on can prove it gives the same answers as V8. The mobile app's
 * dev-only engine check screen calls `runEngineCheck()` on Hermes; engine-check.test.ts runs it on V8.
 *
 * It covers the kinds that `calculateUkTax` and `calculateEmployerNISavings` answer directly:
 * income tax and Gift Aid in both regions, and the employer NI saving from salary sacrifice.
 * No arithmetic lives here: each vector's input goes to the engine and the result is compared with
 * the vector's expected value by `runUkTaxVectors`.
 */
import type { UkTaxYear } from "../types.js";
import { calculateEmployerNISavings, calculateUkTax } from "../uk-tax.js";
import {
  runUkTaxVectors,
  UK_TAX_VECTORS,
  type UkTaxVector,
  type UkTaxVectorKind,
  type UkTaxVectorRunResult,
} from "./uk-tax.vectors.js";

/** The vector kinds the engine check runs, in the order they are reported. */
export const ENGINE_CHECK_KINDS = [
  "incomeTax",
  "giftAid",
  "employerNiSaving",
] as const satisfies readonly UkTaxVectorKind[];

type EngineCheckKind = (typeof ENGINE_CHECK_KINDS)[number];

const isCheckedKind = (kind: UkTaxVectorKind): kind is EngineCheckKind =>
  (ENGINE_CHECK_KINDS as readonly UkTaxVectorKind[]).includes(kind);

function evaluate(vector: UkTaxVector): number {
  const taxYear = vector.taxYear as UkTaxYear;
  switch (vector.kind) {
    case "incomeTax": {
      const { grossIncome } = vector.input as { grossIncome: number };
      return calculateUkTax({ grossSalary: grossIncome, taxYear, region: vector.region })
        .incomeTaxGbp;
    }
    case "giftAid": {
      const { grossIncome, giftAidNet } = vector.input as {
        grossIncome: number;
        giftAidNet: number;
      };
      return calculateUkTax({
        grossSalary: grossIncome,
        taxYear,
        region: vector.region,
        giftAidContributionsGbp: giftAidNet,
      }).incomeTaxGbp;
    }
    case "employerNiSaving": {
      const { grossSalary, salarySacrifice } = vector.input as {
        grossSalary: number;
        salarySacrifice: number;
      };
      return calculateEmployerNISavings(grossSalary, salarySacrifice, taxYear);
    }
    default:
      throw new Error(`Engine check has no evaluator for vector kind ${vector.kind}`);
  }
}

/**
 * Run every vector of the checked kinds through the engine. `failures` is empty when the engine
 * matches every hand-derived value to within half a penny.
 */
export function runEngineCheck(
  vectors: readonly UkTaxVector[] = UK_TAX_VECTORS,
): UkTaxVectorRunResult {
  return runUkTaxVectors(
    vectors.filter((v) => isCheckedKind(v.kind)),
    evaluate,
  );
}
