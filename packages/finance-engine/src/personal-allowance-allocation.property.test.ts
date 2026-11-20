import { describe, expect, it } from "vitest";
import {
  allocatePersonalAllowance,
  type PersonalAllowanceAllocation,
  type PersonalAllowanceAllocationInput,
} from "./personal-allowance-allocation.js";
import type { UkTaxRegion } from "./types.js";
import {
  calculatePersonalAllowanceForYear,
  getUkTaxYearRules,
  SUPPORTED_UK_TAX_YEARS,
  type UkTaxYearRules,
} from "./uk-tax-year.js";

/**
 * Property test for the allowance search. The tax of an allocation is worked out here by an
 * oracle written the way the ledger stacks income (ITA 2007 s.16: non-savings, then savings, then
 * dividends), in exact integer units of 1/10,000 of a pound, not by the code under test. Inputs
 * are whole pounds, so every corner is a whole pound and the oracle is exact.
 *
 * Checked against a reference that tries every corner of every line where the tax bends, the
 * downward bends the search leaves out included (the starting rate limit, the PSA or dividend
 * allowance reaching a band limit), and against a coarse grid on some cases:
 * - the search's total in pence equals the reference's lowest;
 * - when the lowest equals today's order in pence, the allocation does not move.
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

interface Band {
  rate: number;
  lo: number;
  hi: number;
}

/** UK limits, built here (not with the engine's helpers), at the given rates. */
function ukBands(r: UkTaxYearRules, ext: number, rates: readonly number[]): Band[] {
  const b = r.ewni.basicRateBandWidth + ext;
  const h = r.ewni.additionalRateThreshold + ext;
  return [
    { rate: rates[0] as number, lo: 0, hi: b },
    { rate: rates[1] as number, lo: b, hi: h },
    { rate: rates[2] as number, lo: h, hi: Number.POSITIVE_INFINITY },
  ];
}

/** Non-savings bands; in Scotland the extension lifts the 20% band's top and every limit above. */
function nonSavingsBands(r: UkTaxYearRules, region: UkTaxRegion, ext: number): Band[] {
  if (region !== "SCOTLAND") {
    return ukBands(r, ext, [r.ewni.basicRate, r.ewni.higherRate, r.ewni.additionalRate]);
  }
  const bands = r.scotland.bands;
  const basic = bands.findIndex((x) => x.rate === 0.2);
  return bands.map((x, k) => ({
    rate: x.rate,
    lo: x.from + (k > basic ? ext : 0),
    hi: x.to === null ? Number.POSITIVE_INFINITY : x.to + (k >= basic ? ext : 0),
  }));
}

/** Exact tax on [lo, hi] in 1/10,000 of a pound (whole-pound amounts, rates to 0.01%). */
const slice = (bands: Band[], lo: number, hi: number): number =>
  bands.reduce(
    (t, b) => t + Math.round(b.rate * 10000) * Math.max(0, Math.min(hi, b.hi) - Math.max(lo, b.lo)),
    0,
  );

function exactTax(i: PersonalAllowanceAllocationInput, a: PersonalAllowanceAllocation): number {
  const r = i.rules;
  const ext = i.bandExtension ?? 0;
  const n = Math.round(i.nonSavings - a.onNonSavings);
  const s = Math.round(i.savings - a.onSavings);
  const d = Math.round(i.dividends - a.onDividends);
  const startingRate = Math.min(Math.max(0, r.savings.startingRateBand - n), s);
  const psa = Math.min(i.personalSavingsAllowance, s - startingRate);
  // Savings at the year's savings rates: the main rates to 2026/27, 24/44/49 from 2027/28.
  const sr = r.savingsRates;
  const uk = ukBands(r, ext, [sr.basicRate, sr.higherRate, sr.additionalRate]);
  const div = r.dividends;
  const nil = Math.min(div.allowance, d);
  const dividendBands = ukBands(r, ext, [div.basicRate, div.higherRate, div.additionalRate]);
  // From 2027/28 (England, Wales and NI) other income comes first at the main rates, less the
  // allowance (s.25(3A)), and property sits above it at the property rates (s.16A, s.11CA).
  const pr = i.region === "SCOTLAND" ? null : r.propertyRates;
  const used = Math.min(i.allowance, i.nonSavings + i.savings + i.dividends);
  const otherTaxable = Math.max(0, (i.otherIncomeFirst ?? 0) - used);
  const nonSavingsTax = pr
    ? slice(nonSavingsBands(r, i.region, ext), 0, otherTaxable) +
      slice(ukBands(r, ext, [pr.basicRate, pr.higherRate, pr.additionalRate]), otherTaxable, n)
    : slice(nonSavingsBands(r, i.region, ext), 0, n);
  return (
    nonSavingsTax +
    slice(uk, n + startingRate + psa, n + s) +
    slice(dividendBands, n + s + nil, n + s + d)
  );
}
/** To pence, half a penny up; exact on integers. */
const pence = (units: number): number => Math.floor((units + 50) / 100);

function todayOrder(i: PersonalAllowanceAllocationInput): PersonalAllowanceAllocation {
  const used = Math.min(i.allowance, i.nonSavings + i.savings + i.dividends);
  const onNonSavings = Math.min(used, i.nonSavings);
  const onSavings = Math.min(used - onNonSavings, i.savings);
  return { onNonSavings, onSavings, onDividends: used - onNonSavings - onSavings };
}

/** Lowest exact tax over every corner of every bend line, downward bends included. */
function referenceMinimum(i: PersonalAllowanceAllocationInput): number {
  const r = i.rules;
  const ext = i.bandExtension ?? 0;
  const { nonSavings: N, savings: S, dividends: D } = i;
  const used = Math.min(i.allowance, N + S + D);
  const T = N + S + D - used;
  const lock = Math.min(used, i.otherIncomeFirst ?? 0);
  const nMin = Math.max(0, N - used);
  const nMax = Math.min(N - lock, T);
  const limits = ukBands(r, ext, [0, 0, 0]).map((b) => b.lo);
  const SR = r.savings.startingRateBand;
  const DA = r.dividends.allowance;
  const P = i.personalSavingsAllowance;
  const nLines = [
    nMin,
    nMax,
    SR,
    ...nonSavingsBands(r, i.region, ext).map((b) => b.lo),
    ...limits,
    ...limits.map((l) => l - P),
  ];
  const mLines = [T - D, T, SR, SR + P, T - DA, ...limits, ...limits.map((l) => l - DA)];
  const kLines = [0, S, P];
  const points: [number, number][] = [];
  for (const n of nLines) {
    for (const m of mLines) points.push([n, m]);
    for (const k of kLines) points.push([n, n + k]);
  }
  for (const m of mLines) for (const k of kLines) points.push([m - k, m]);
  let best = Number.POSITIVE_INFINITY;
  for (const [n, m] of points) {
    const feasible = n >= nMin && n <= nMax && m >= Math.max(T - D, n) && m <= Math.min(T, n + S);
    if (!feasible) continue;
    const a = { onNonSavings: N - n, onSavings: S - (m - n), onDividends: D - (T - m) };
    best = Math.min(best, exactTax(i, a));
  }
  return best;
}

/** Grid of allocations in 40 steps each way, for a second, independent check. */
function gridMinimum(i: PersonalAllowanceAllocationInput): number {
  const used = Math.min(i.allowance, i.nonSavings + i.savings + i.dividends);
  const lock = Math.min(used, i.otherIncomeFirst ?? 0);
  const nHi = Math.min(used, i.nonSavings);
  let best = Number.POSITIVE_INFINITY;
  for (let p = 0; p <= 40; p++) {
    const onNonSavings = Math.round(lock + ((nHi - lock) * p) / 40);
    const sHi = Math.min(used - onNonSavings, i.savings);
    for (let q = 0; q <= 40; q++) {
      const onSavings = Math.round((sHi * q) / 40);
      const onDividends = used - onNonSavings - onSavings;
      if (onDividends < 0 || onDividends > i.dividends) continue;
      best = Math.min(best, exactTax(i, { onNonSavings, onSavings, onDividends }));
    }
  }
  return best;
}

function randomCase(rnd: () => number): PersonalAllowanceAllocationInput {
  // A third of the cases in 2027/28, the year with property and savings rates of its own.
  const year =
    rnd() < 0.33
      ? "2027/28"
      : SUPPORTED_UK_TAX_YEARS[Math.floor(rnd() * SUPPORTED_UK_TAX_YEARS.length)]!;
  const rules = getUkTaxYearRules(year);
  const propertyYear = rules.propertyRates !== null;
  // A Scottish 2027/28 estimate is refused upstream (no Scottish table), so none is drawn.
  const region: UkTaxRegion = !propertyYear && rnd() < 0.35 ? "SCOTLAND" : "ENGLAND_NI_WALES";
  const pick = (max: number) => Math.round(rnd() * max);
  const mode = rnd();
  // Four mixes: the starting rate zone, around the basic rate limit, anywhere (taper included),
  // and a PSA band straddling the basic rate limit.
  const [nonSavings, savings, dividends] =
    mode < 0.25
      ? [pick(20000), pick(20000), pick(30000)]
      : mode < 0.55
        ? [35000 + pick(20000), pick(8000), pick(20000)]
        : mode < 0.75
          ? [pick(140000), pick(30000), pick(60000)]
          : [40000 + pick(10000), 400 + pick(1500), pick(3000)];
  const bandExtension = rnd() < 0.5 ? 0 : pick(8000);
  const total = nonSavings + savings + dividends;
  // Gift Aid and relief at source also lower adjusted net income for the taper (ITA 2007 s.58).
  const allowance = calculatePersonalAllowanceForYear(total - bandExtension, rules);
  const taxable = Math.max(0, total - allowance);
  const personalSavingsAllowance =
    taxable > rules.ewni.additionalRateThreshold + bandExtension
      ? rules.savings.psaAdditional
      : taxable > rules.ewni.basicRateBandWidth + bandExtension
        ? rules.savings.psaHigher
        : rules.savings.psaBasic;
  // From 2027/28 s.25(3A) always applies: other income (often under the allowance, so some is left
  // to share) and the rest property. Before, a lock is drawn now and then to test the mechanism.
  const otherIncomeFirst = propertyYear
    ? Math.min(nonSavings, pick(rnd() < 0.6 ? 12570 : nonSavings))
    : rnd() < 0.2
      ? pick(nonSavings)
      : undefined;
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

describe("allocatePersonalAllowance property", () => {
  it("matches every corner of every bend, and moves only when strictly lower", () => {
    const rnd = seeded(20261120);
    let moved = 0;
    let ties = 0;
    for (let k = 0; k < 600; k++) {
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
      expect(a.onSavings, label).toBeGreaterThanOrEqual(-1e-6);
      expect(a.onSavings, label).toBeLessThanOrEqual(i.savings + 1e-6);
      expect(a.onDividends, label).toBeGreaterThanOrEqual(-1e-6);
      expect(a.onDividends, label).toBeLessThanOrEqual(i.dividends + 1e-6);

      const found = pence(exactTax(i, a));
      const lowest = pence(referenceMinimum(i));
      expect(found, label).toBe(lowest);
      if (k < 60) expect(found, label).toBeLessThanOrEqual(pence(gridMinimum(i)));
      // Today's order always meets s.25(3A): it puts the most on non-savings income.
      const today = todayOrder(i);
      if (pence(exactTax(i, today)) === lowest) {
        ties++;
        expect(a, label).toEqual(today);
      } else {
        moved++;
      }
    }
    // The generator must reach both kinds of case, or the test proves little.
    expect(moved).toBeGreaterThan(30);
    expect(ties).toBeGreaterThan(30);
  });
});
