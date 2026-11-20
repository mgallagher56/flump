import { describe, expect, it } from "vitest";
import {
  allocatePersonalAllowance,
  type PersonalAllowanceAllocation,
  type PersonalAllowanceAllocationInput,
} from "./personal-allowance-allocation.js";
import type { UkTaxRegion } from "./types.js";
import {
  calculateIncomeTaxOnTaxable,
  calculatePersonalAllowanceForYear,
  getUkTaxYearRules,
  SUPPORTED_UK_TAX_YEARS,
} from "./uk-tax-year.js";

/**
 * Property test: the allocation the vertex search picks is never above any allocation on a
 * brute-force grid, and never above today's order (non-savings, then savings, then dividends).
 * The tax of an allocation is worked out here by an oracle written the way the ledger stacks
 * income (ITA 2007 s.16: non-savings, then savings, then dividends), not by the code under test.
 * Deterministic: a seeded generator, so a failure always reproduces.
 */

/** mulberry32: small seeded generator. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function oracleTax(i: PersonalAllowanceAllocationInput, a: PersonalAllowanceAllocation): number {
  const ext = i.bandExtension ?? 0;
  const n = i.nonSavings - a.onNonSavings;
  const s = i.savings - a.onSavings;
  const d = i.dividends - a.onDividends;
  const ns = calculateIncomeTaxOnTaxable(n, i.rules, i.region, { bandExtension: ext }).total;
  const uk = (x: number) =>
    calculateIncomeTaxOnTaxable(x, i.rules, "ENGLAND_NI_WALES", { bandExtension: ext }).total;
  const startingRate = Math.min(Math.max(0, i.rules.savings.startingRateBand - n), s);
  const psa = Math.min(i.personalSavingsAllowance, s - startingRate);
  const zeroTop = n + startingRate + psa;
  const sav = uk(n + s) - uk(zeroTop);
  const div = i.rules.dividends;
  const nil = Math.min(div.allowance, d);
  const start = n + s + nil;
  const end = n + s + d;
  const basicTop = i.rules.ewni.basicRateBandWidth + ext;
  const higherTop = i.rules.ewni.additionalRateThreshold + ext;
  const part = (lo: number, hi: number) => Math.max(0, Math.min(end, hi) - Math.max(start, lo));
  const dividendTax =
    part(0, basicTop) * div.basicRate +
    part(basicTop, higherTop) * div.higherRate +
    part(higherTop, Number.POSITIVE_INFINITY) * div.additionalRate;
  return ns + sav + dividendTax;
}

function randomCase(rnd: () => number): PersonalAllowanceAllocationInput {
  const year = SUPPORTED_UK_TAX_YEARS[Math.floor(rnd() * SUPPORTED_UK_TAX_YEARS.length)]!;
  const rules = getUkTaxYearRules(year);
  const region: UkTaxRegion = rnd() < 0.3 ? "SCOTLAND" : "ENGLAND_NI_WALES";
  const pick = (max: number) => Math.round(rnd() * max);
  // Half the cases sit near the basic rate limit, where moves pay most often.
  const nonSavings = rnd() < 0.5 ? 40000 + pick(20000) : pick(140000);
  const savings = rnd() < 0.2 ? 0 : pick(15000);
  const dividends = rnd() < 0.2 ? 0 : pick(40000);
  const bandExtension = rnd() < 0.6 ? 0 : pick(5000);
  const total = nonSavings + savings + dividends;
  // Gift Aid and relief at source also lower adjusted net income for the taper (ITA 2007 s.58).
  const allowance = calculatePersonalAllowanceForYear(total - bandExtension, rules);
  const taxable = Math.max(0, total - allowance);
  const personalSavingsAllowance =
    taxable > rules.ewni.additionalRateThreshold
      ? rules.savings.psaAdditional
      : taxable > rules.ewni.basicRateBandWidth
        ? rules.savings.psaHigher
        : rules.savings.psaBasic;
  const otherIncomeFirst = rnd() < 0.3 ? pick(nonSavings) : undefined;
  return {
    rules,
    region,
    allowance,
    nonSavings,
    savings,
    dividends,
    personalSavingsAllowance,
    bandExtension,
    otherIncomeFirst,
  };
}

function todayOrder(i: PersonalAllowanceAllocationInput): PersonalAllowanceAllocation {
  const used = Math.min(i.allowance, i.nonSavings + i.savings + i.dividends);
  const onNonSavings = Math.min(used, i.nonSavings);
  const onSavings = Math.min(used - onNonSavings, i.savings);
  return { onNonSavings, onSavings, onDividends: used - onNonSavings - onSavings };
}

const STEPS = 40;
/** Grid of allocations: allowance on non-savings and on savings in STEPS steps each. */
function gridMinimum(i: PersonalAllowanceAllocationInput): number {
  const used = Math.min(i.allowance, i.nonSavings + i.savings + i.dividends);
  const lock = Math.min(used, i.otherIncomeFirst ?? 0);
  const nHi = Math.min(used, i.nonSavings);
  let best = Number.POSITIVE_INFINITY;
  for (let p = 0; p <= STEPS; p++) {
    const onNonSavings = lock + ((nHi - lock) * p) / STEPS;
    const sHi = Math.min(used - onNonSavings, i.savings);
    for (let q = 0; q <= STEPS; q++) {
      const onSavings = (sHi * q) / STEPS;
      const onDividends = used - onNonSavings - onSavings;
      if (onDividends < -1e-9 || onDividends > i.dividends + 1e-9) continue;
      best = Math.min(best, oracleTax(i, { onNonSavings, onSavings, onDividends }));
    }
  }
  return best;
}

describe("allocatePersonalAllowance property", () => {
  it("is never above a brute-force grid or today's order", () => {
    const rnd = seeded(20261120);
    let moved = 0;
    for (let k = 0; k < 150; k++) {
      const i = randomCase(rnd);
      const a = allocatePersonalAllowance(i);
      const used = Math.min(i.allowance, i.nonSavings + i.savings + i.dividends);
      const label = JSON.stringify({ ...i, rules: i.rules.year });
      // A real allocation: within each income, adding up to the allowance used.
      expect(a.onNonSavings + a.onSavings + a.onDividends, label).toBeCloseTo(used, 6);
      expect(a.onNonSavings, label).toBeGreaterThanOrEqual(
        Math.min(used, i.otherIncomeFirst ?? 0) - 1e-6,
      );
      expect(a.onNonSavings, label).toBeLessThanOrEqual(i.nonSavings + 1e-6);
      expect(a.onSavings, label).toBeGreaterThanOrEqual(0);
      expect(a.onSavings, label).toBeLessThanOrEqual(i.savings + 1e-6);
      expect(a.onDividends, label).toBeGreaterThanOrEqual(0);
      expect(a.onDividends, label).toBeLessThanOrEqual(i.dividends + 1e-6);

      // The oracle rounds each band sum to the penny, so 3p covers its rounding.
      const tax = oracleTax(i, a);
      expect(tax, label).toBeLessThanOrEqual(gridMinimum(i) + 0.03);
      // Today's order always meets s.25(3A): it puts the most on non-savings income.
      const today = oracleTax(i, todayOrder(i));
      expect(tax, label).toBeLessThanOrEqual(today + 0.03);
      if (tax < today - 0.01) moved++;
    }
    // The generator must reach cases where the allowance moves, or the test proves little.
    expect(moved).toBeGreaterThan(5);
  });
});
