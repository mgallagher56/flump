/**
 * What-if and marginal-rate API (E25-T6), on the take-home core.
 *
 * - `whatIfGrossChange`: what happens to take-home if salary changes by `deltaGross`.
 * - `whatIfSacrificeChange`: what happens if the employee pension contribution changes.
 * - `marginalRateCurve`: take-home and the effective marginal rate across a range of gross pay, with the
 *   thresholds that shape it. The point rate comes from a GBP1 difference; the smoothed rate from a window
 *   (default GBP1,000). Stepped zones (the High Income Child Benefit Charge, charged per whole GBP100 or
 *   GBP200 step) are listed separately because their point rate shows as spikes.
 *
 * Pure: no formatting. Percentages are numbers (46.22 means 46.22%), rounded to 2 decimal places.
 */

import {
  computeUkTakeHome,
  type UkIncomeScenario,
  type UkTakeHomeBreakdown,
  type UkTakeHomeOptions,
} from "./uk-take-home.js";
import {
  getUkIncomeThresholds,
  scenarioAtGross,
  type UkIncomeThreshold,
} from "./uk-tax-thresholds.js";
import { getUkTaxYearRules, roundPence } from "./uk-tax-year.js";

/** Change in each deduction (positive means more is taken). They sum, with take-home, to the gross change. */
export interface UkComponentDeltas {
  incomeTax: number;
  nationalInsurance: number;
  studentLoan: number;
  hicbc: number;
  pension: number;
}

export interface UkWhatIfResult {
  before: UkTakeHomeBreakdown;
  after: UkTakeHomeBreakdown;
  /** Actual change in gross pay (salary is floored at 0). */
  deltaGross: number;
  deltaTakeHome: number;
  /** Change in what reaches the pension from the employee (after relief at source). */
  deltaPensionGross: number;
  components: UkComponentDeltas;
  /** deltaTakeHome / deltaGross x 100. 0 when gross does not change. */
  keepRatePct: number;
  /** 100 - keepRatePct. 0 when gross does not change. */
  effectiveMarginalRatePct: number;
}

const pct = (x: number) => Math.round(x * 10000) / 100;

function diff(before: UkTakeHomeBreakdown, after: UkTakeHomeBreakdown): UkWhatIfResult {
  const deltaGross = roundPence(after.grossPay - before.grossPay);
  const deltaTakeHome = roundPence(after.takeHome - before.takeHome);
  const keep = deltaGross === 0 ? 0 : deltaTakeHome / deltaGross;
  return {
    before,
    after,
    deltaGross,
    deltaTakeHome,
    deltaPensionGross: roundPence(after.pensionGross - before.pensionGross),
    components: {
      incomeTax: roundPence(after.incomeTax - before.incomeTax),
      nationalInsurance: roundPence(after.nationalInsurance - before.nationalInsurance),
      studentLoan: roundPence(after.studentLoan - before.studentLoan),
      hicbc: roundPence(after.hicbc - before.hicbc),
      pension: roundPence(after.pensionEmployee - before.pensionEmployee),
    },
    keepRatePct: deltaGross === 0 ? 0 : pct(keep),
    effectiveMarginalRatePct: deltaGross === 0 ? 0 : pct(1 - keep),
  };
}

/** Take-home before and after salary changes by `deltaGross` (bonus and other inputs unchanged). */
export function whatIfGrossChange(
  s: UkIncomeScenario,
  deltaGross: number,
  opts: UkTakeHomeOptions = {},
): UkWhatIfResult {
  const before = computeUkTakeHome(s, opts);
  const salary = Math.max(0, (Number.isFinite(s.salary) ? s.salary : 0) + deltaGross);
  const after = computeUkTakeHome({ ...s, salary, taxYear: before.ratesYear }, opts);
  return diff(before, { ...after, taxYear: before.taxYear, isFallback: before.isFallback });
}

/**
 * Take-home before and after the employee pension contribution changes by `deltaContribution` pounds a
 * year (for relief at source, the net amount paid). A percentage pension is converted to its amount
 * first. With no pension in the scenario, salary sacrifice is assumed.
 */
export function whatIfSacrificeChange(
  s: UkIncomeScenario,
  deltaContribution: number,
  opts: UkTakeHomeOptions = {},
): UkWhatIfResult {
  const before = computeUkTakeHome(s, opts);
  const method = s.pension?.method ?? "salary-sacrifice";
  const assumedMethod = s.pension === undefined;
  const amount = Math.max(0, before.pensionEmployee + deltaContribution);
  const after = computeUkTakeHome(
    { ...s, pension: { method, amount }, taxYear: before.ratesYear },
    opts,
  );
  const r = diff(before, { ...after, taxYear: before.taxYear, isFallback: before.isFallback });
  if (assumedMethod) {
    r.after.assumptions = [
      ...r.after.assumptions,
      { code: "pensionMethodAssumed", unverified: false },
    ];
  }
  return r;
}

export interface UkMarginalRatePoint {
  gross: number;
  takeHome: number;
  /** Effective marginal rate from a GBP1 rise. Spiky inside stepped zones. */
  pointRatePct: number;
  /** Effective marginal rate over the next `window` pounds. */
  smoothedRatePct: number;
  /** Per-pound deductions over the next `window` pounds, as rates (pct of the window). */
  componentRatesPct: UkComponentDeltas;
}

export interface UkSteppedZone {
  from: number;
  to: number;
  ruleKey: "hicbc";
}

export interface UkMarginalRateCurve {
  points: UkMarginalRatePoint[];
  thresholds: UkIncomeThreshold[];
  steppedZones: UkSteppedZone[];
  /** The scenario's own gross pay (salary plus bonus) and its point on the curve. */
  yourPay: { gross: number; next: UkWhatIfResult };
  window: number;
  ratesYear: UkTakeHomeBreakdown["ratesYear"];
  asAtTaxYear: UkTakeHomeBreakdown["ratesYear"];
  taxYear: string;
  isFallback: boolean;
  assumptions: UkTakeHomeBreakdown["assumptions"];
  unverifiedRuleKeys: UkTakeHomeBreakdown["unverifiedRuleKeys"];
  verification: UkTakeHomeBreakdown["verification"];
  isUnverifiedEstimate: boolean;
}

export interface UkMarginalRateCurveOptions extends UkTakeHomeOptions {
  from?: number;
  to?: number;
  step?: number;
  /** Width of the smoothing window in pounds. Default 1,000. */
  window?: number;
}

const MAX_POINTS = 5000;

/**
 * Take-home and the effective marginal rate from `from` to `to` gross pay (defaults 0 to 150,000 in
 * steps of 250, about 600 points). All pay is treated as salary on the curve (a bonus is taxed like
 * salary under the annual method). `yourPay.next` is the what-if for the next `window` pounds at the
 * scenario's own pay, with its bonus kept.
 */
export function marginalRateCurve(
  s: UkIncomeScenario,
  opts: UkMarginalRateCurveOptions = {},
): UkMarginalRateCurve {
  const from = Math.max(0, opts.from ?? 0);
  const to = Math.max(from, opts.to ?? 150_000);
  const step = Math.max(1, opts.step ?? 250);
  const window = Math.max(1, opts.window ?? 1000);
  if ((to - from) / step > MAX_POINTS) {
    throw new RangeError(`marginalRateCurve: more than ${MAX_POINTS} points requested`);
  }

  const yours = whatIfGrossChange(s, window, opts);
  const year = yours.before;
  const fixed: UkIncomeScenario = { ...s, taxYear: year.ratesYear };
  const at = (g: number) => computeUkTakeHome(scenarioAtGross(fixed, g));

  const points: UkMarginalRatePoint[] = [];
  for (let g = from; g <= to + 1e-9; g += step) {
    const here = at(g);
    const one = at(g + 1);
    const next = diff(here, at(g + window));
    const rate = (d: number) => pct(d / window);
    points.push({
      gross: roundPence(g),
      takeHome: here.takeHome,
      pointRatePct: pct(1 - (one.takeHome - here.takeHome)),
      smoothedRatePct: next.effectiveMarginalRatePct,
      componentRatesPct: {
        incomeTax: rate(next.components.incomeTax),
        nationalInsurance: rate(next.components.nationalInsurance),
        studentLoan: rate(next.components.studentLoan),
        hicbc: rate(next.components.hicbc),
        pension: rate(next.components.pension),
      },
    });
  }

  const thresholds = getUkIncomeThresholds(getUkTaxYearRules(year.ratesYear), fixed);
  // The curve crosses rules your own pay may not touch (the taper, say), so its labels cover the whole
  // range: your pay, the top of the range and every threshold drawn on it.
  const top = at(to);
  const inRange = thresholds.filter(
    (t) => t.grossAt !== null && t.grossAt >= from && t.grossAt <= to,
  );
  const unverifiedRuleKeys = [
    ...new Set([
      ...year.unverifiedRuleKeys,
      ...top.unverifiedRuleKeys,
      ...inRange.filter((t) => t.status === "unverified").map((t) => t.ruleKey),
    ]),
  ];
  const assumptions = [...year.assumptions];
  for (const a of top.assumptions) {
    if (!assumptions.some((b) => b.code === a.code)) assumptions.push(a);
  }
  const start = thresholds.find((t) => t.kind === "hicbcStart")?.grossAt;
  const end = thresholds.find((t) => t.kind === "hicbcEnd")?.grossAt;
  const steppedZones: UkSteppedZone[] =
    start != null && end != null ? [{ from: start, to: end, ruleKey: "hicbc" }] : [];

  return {
    points,
    thresholds,
    steppedZones,
    yourPay: { gross: year.grossPay, next: yours },
    window,
    ratesYear: year.ratesYear,
    asAtTaxYear: year.ratesYear,
    taxYear: year.taxYear,
    isFallback: year.isFallback,
    assumptions,
    unverifiedRuleKeys,
    verification: year.verification,
    isUnverifiedEstimate:
      year.isUnverifiedEstimate ||
      top.isUnverifiedEstimate ||
      unverifiedRuleKeys.length > 0 ||
      assumptions.some((a) => a.unverified),
  };
}
