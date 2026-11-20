import type { UkTaxRegion } from "./types.js";
import {
  dividendBandLimits,
  type IncomeTaxBandLimit,
  incomeTaxBandLimits,
  type UkTaxYearRules,
} from "./uk-tax-year.js";

/**
 * Where the Personal Allowance is set against income (ITA 2007 s.25(2)): "in the way which will
 * result in the greatest reduction in the taxpayer's liability to income tax". That is not always
 * non-savings income first. Allowance spent on interest the starting rate (s.12) or the Personal
 * Savings Allowance (s.12B) would cover anyway is better spent on dividends, and a nil band that
 * straddles the basic rate limit pays more above it (HMRC Dividend Allowance factsheet, 2015,
 * example 6, splits the allowance part-way). From 2027/28, s.25(3A) sets the allowance against
 * income other than property, savings and dividend income first; only what is left is shared.
 */
export interface PersonalAllowanceAllocationInput {
  rules: UkTaxYearRules;
  /** Scottish rates apply to non-savings income only (s.11A); savings and dividends use UK bands. */
  region: UkTaxRegion;
  /** The Personal Allowance after the taper. Only as much as there is income is used. */
  allowance: number;
  /** Non-savings income: salary, trading profit and property profit. */
  nonSavings: number;
  savings: number;
  dividends: number;
  /** The Personal Savings Allowance for the year's taxable income (s.12B). */
  personalSavingsAllowance: number;
  /**
   * Grossed-up Gift Aid (ITA 2007 s.414) and relief-at-source pension contributions (FA 2004
   * s.192(4)): raise the basic and higher rate limits, so they move the band edges searched.
   */
  bandExtension?: number;
  /**
   * s.25(3A), 2027/28 on: the part of `nonSavings` that is not property income. The allowance
   * goes against it first. Left out before 2027/28.
   */
  otherIncomeFirst?: number;
}

export interface PersonalAllowanceAllocation {
  onNonSavings: number;
  onSavings: number;
  onDividends: number;
}

/** s.25(3A) applies from 2027/28 (inserted by Finance Act 2026 s.6). */
export function allowanceGoesToOtherIncomeFirst(rules: UkTaxYearRules): boolean {
  return Number(rules.year.slice(0, 4)) >= 2027;
}

/** Tax on the slice [lo, hi] of taxable income, at each band's rate. */
function taxBetween(bands: readonly IncomeTaxBandLimit[], lo: number, hi: number): number {
  let tax = 0;
  for (const band of bands) {
    tax += band.rate * Math.max(0, Math.min(hi, band.upper) - Math.max(lo, band.lower));
  }
  return tax;
}

/** Positions closer than this are the same allocation (float noise, far below a penny). */
const SAME = 1e-6;

/**
 * The allocation with the lowest Income Tax. With the allowance used and total taxable income T
 * fixed, the tax depends on two positions: n, the top of taxable non-savings income, and m, the
 * top of taxable savings. It is continuous and piecewise linear in (n, m), cut by lines of three
 * kinds: n constant, m constant and m - n constant. A linear function on a convex piece is lowest
 * at a corner, so every crossing of two such lines is tried (the function is not convex, so no
 * local search). The tax of each is compared in pence. The allocation moves away from today's
 * order (non-savings, then savings, then dividends) only when strictly lower, and among equal
 * lowest allocations takes the one closest to it: the most on non-savings, then on savings.
 */
export function allocatePersonalAllowance(
  i: PersonalAllowanceAllocationInput,
): PersonalAllowanceAllocation {
  const { rules, nonSavings, savings, dividends } = i;
  const psa = i.personalSavingsAllowance;
  const used = Math.min(i.allowance, nonSavings + savings + dividends);
  const total = nonSavings + savings + dividends - used;
  const lock = Math.min(used, i.otherIncomeFirst ?? 0);
  const nonSavingsBands = incomeTaxBandLimits(rules, i.region, i.bandExtension);
  const ukBands = incomeTaxBandLimits(rules, "ENGLAND_NI_WALES", i.bandExtension);
  const dividendBands = dividendBandLimits(rules, i.bandExtension);
  const dividendAllowance = rules.dividends.allowance;
  const startingRate = rules.savings.startingRateBand;

  // Income Tax with non-savings taxable to n and savings taxable to m (ITA 2007 s.16 order).
  // Savings are nil-rated up to the starting rate and then the PSA; dividends up to the dividend
  // allowance. Both nil bands still use band space.
  const tax = (n: number, m: number): number => {
    const nilSavingsTop = Math.min(Math.max(n, startingRate) + psa, m);
    return (
      taxBetween(nonSavingsBands, 0, n) +
      taxBetween(ukBands, nilSavingsTop, m) +
      taxBetween(dividendBands, Math.min(m + dividendAllowance, total), total)
    );
  };
  // Rounded to pence here and nowhere else in the search.
  const pence = (n: number, m: number): number => Math.round(tax(n, m) * 100);

  // Feasible region: allowance on each income between nothing and the whole income, and at
  // least `lock` on non-savings income.
  const nMin = Math.max(0, nonSavings - used);
  const nMax = Math.min(nonSavings - lock, total);
  const place = (n: number, m: number): [number, number] => {
    const nIn = Math.min(Math.max(n, nMin), nMax);
    const mIn = Math.min(Math.max(m, total - dividends, nIn), Math.min(total, nIn + savings));
    return [nIn, mIn];
  };

  const onNonSavings = Math.min(used, nonSavings);
  const onSavings = Math.min(used - onNonSavings, savings);
  let chosen: PersonalAllowanceAllocation = {
    onNonSavings,
    onSavings,
    onDividends: used - onNonSavings - onSavings,
  };
  let bestN = nonSavings - onNonSavings;
  let bestM = bestN + savings - onSavings;
  let bestPence = pence(bestN, bestM);

  // The edges: the region's own bounds, the band limits (extended), the starting rate, and where
  // the PSA or the dividend allowance crosses a band limit or reaches the top of the income.
  const limits = ukBands.slice(0, 2).map((b) => b.upper);
  const nLines = [
    nMin,
    nMax,
    startingRate,
    ...nonSavingsBands.map((b) => b.lower),
    ...limits,
    ...limits.map((l) => l - psa),
  ];
  const mLines = [
    total - dividends,
    total,
    startingRate,
    startingRate + psa,
    total - dividendAllowance,
    ...limits,
    ...limits.map((l) => l - dividendAllowance),
  ];
  const kLines = [0, savings, psa];
  const points: [number, number][] = [];
  for (const n of nLines) {
    for (const m of mLines) points.push([n, m]);
    for (const k of kLines) points.push([n, n + k]);
  }
  for (const m of mLines) for (const k of kLines) points.push([m - k, m]);

  for (const point of points) {
    const [n, m] = place(...point);
    const p = pence(n, m);
    const closer = n < bestN - SAME || (n < bestN + SAME && m < bestM - SAME);
    if (p < bestPence || (p === bestPence && closer)) {
      bestPence = p;
      bestN = n;
      bestM = m;
      chosen = {
        onNonSavings: nonSavings - n,
        onSavings: savings - (m - n),
        onDividends: dividends - (total - m),
      };
    }
  }
  return chosen;
}
