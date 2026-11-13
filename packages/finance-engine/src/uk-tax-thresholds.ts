/**
 * Thresholds and cliffs map (E25-T4).
 *
 * Every threshold is read from the year's rules (`getUkTaxYearRules`) and tagged with the registry rule
 * group it comes from, its source URL and its verification status. `grossAt` is the gross pay at which
 * the threshold is crossed for this scenario's pension method, student loan plans and Gift Aid, found by
 * bisection on the take-home core (each measure rises with gross pay, so the crossing is unique).
 *
 * The x-axis is gross pay with all pay treated as salary (a bonus is taxed like salary under the annual
 * method; a pension given as a percentage is a percentage of that pay).
 *
 * Not included: the childcare marker (DECISIONS round 4 D5). Its £100,000 figure is not yet in the sourced
 * rules registry, so it is a follow-up rather than an unsourced constant.
 */

import type { UkTaxRegion } from "./types.js";
import { UK_RULE_SOURCES, type UkRuleKey, type UkRuleStatus } from "./uk-rule-sources.js";
import {
  computeUkTakeHome,
  type UkIncomeScenario,
  type UkTakeHomeBreakdown,
} from "./uk-take-home.js";
import { roundPence, type UkStudentLoanPlanKey, type UkTaxYearRules } from "./uk-tax-year.js";

export type UkThresholdKind =
  | "incomeTaxStarts"
  | "higherRate"
  | "additionalRate"
  | "scottishBand"
  | "taperStart"
  | "taperEnd"
  | "niPrimaryThreshold"
  | "niUpperEarningsLimit"
  | "studentLoan"
  | "hicbcStart"
  | "hicbcEnd";

/** The quantity a rule tests. */
export type UkThresholdMeasure = "adjustedNetIncome" | "taxableIncome" | "niPay" | "studentLoanPay";

export interface UkIncomeThreshold {
  kind: UkThresholdKind;
  measure: UkThresholdMeasure;
  /** The rule's own figure, in terms of `measure`. */
  at: number;
  /**
   * Band edges above the basic rate move up by grossed-up relief-at-source contributions and Gift Aid.
   * This is that extension at `grossAt` (0 for every other threshold).
   */
  bandExtension: number;
  /** Gross pay at which it is crossed for this scenario; null if never crossed below the search cap. */
  grossAt: number | null;
  /** Adjusted net income at `grossAt`. */
  aniAt: number | null;
  ruleKey: UkRuleKey;
  status: UkRuleStatus;
  source: string;
  /** Set for `studentLoan`. */
  plan?: UkStudentLoanPlanKey;
  /** Set for `scottishBand`, `higherRate` and `additionalRate`: the band that starts here. */
  band?: { name: string; rate: number };
}

const SEARCH_CAP = 10_000_000;

const MEASURES: Record<UkThresholdMeasure, (b: UkTakeHomeBreakdown) => number> = {
  adjustedNetIncome: (b) => b.adjustedNetIncome,
  taxableIncome: (b) => b.taxableIncome,
  niPay: (b) => b.niPay,
  studentLoanPay: (b) => b.studentLoanPay,
};

/** The scenario with gross pay `g`, all as salary. */
export function scenarioAtGross(s: UkIncomeScenario, g: number): UkIncomeScenario {
  return { ...s, salary: Math.max(0, g), bonus: 0 };
}

/** Band extension in a breakdown: grossed-up relief at source plus grossed-up Gift Aid. */
function bandExtensionOf(b: UkTakeHomeBreakdown): number {
  return b.bandExtension;
}

/**
 * Smallest gross pay (to the penny) at which the measure exceeds `at`, or null below the search cap.
 * With `extended`, the measure is taxable income less the band extension, so a pension set as a
 * percentage (whose extension grows with pay) is still solved exactly.
 */
function solveGross(
  s: UkIncomeScenario,
  rules: UkTaxYearRules,
  measure: UkThresholdMeasure,
  at: number,
  extended: boolean,
): number | null {
  const m = (g: number) => {
    const b = computeUkTakeHome(scenarioAtGross(s, g));
    return MEASURES[measure](b) - (extended ? bandExtensionOf(b) : 0);
  };
  if (m(SEARCH_CAP) <= at) return null;
  if (m(0) > at) return 0;
  let lo = 0;
  let hi = SEARCH_CAP;
  while (hi - lo > 0.005) {
    const mid = (lo + hi) / 2;
    if (m(mid) > at) hi = mid;
    else lo = mid;
  }
  // The boundary itself (the last pay still at or below the figure), floored to the penny.
  return Math.floor(lo * 100 + 1e-6) / 100;
}

export function getUkIncomeThresholds(
  rules: UkTaxYearRules,
  scenario: UkIncomeScenario,
): UkIncomeThreshold[] {
  const s: UkIncomeScenario = { ...scenario, taxYear: rules.year };
  const region: UkTaxRegion = s.region ?? "ENGLAND_NI_WALES";
  const sources = UK_RULE_SOURCES[rules.year];
  type Draft = Omit<
    UkIncomeThreshold,
    "grossAt" | "aniAt" | "status" | "source" | "bandExtension"
  > & {
    extended?: boolean;
  };
  const out: Draft[] = [];
  out.push({
    kind: "incomeTaxStarts",
    measure: "taxableIncome",
    at: 0,
    ruleKey: "personalAllowance",
  });
  if (region === "SCOTLAND") {
    const basicIdx = rules.scotland.bands.findIndex((b) => b.rate === 0.2);
    for (const [i, band] of rules.scotland.bands.entries()) {
      if (i === 0) continue;
      out.push({
        kind: "scottishBand",
        measure: "taxableIncome",
        at: band.from,
        extended: i > basicIdx,
        ruleKey: "incomeTaxScotland",
        band: { name: band.name, rate: band.rate },
      });
    }
  } else {
    const e = rules.ewni;
    out.push(
      {
        kind: "higherRate",
        measure: "taxableIncome",
        at: e.basicRateBandWidth,
        extended: true,
        ruleKey: "incomeTaxEwni",
        band: { name: "Higher", rate: e.higherRate },
      },
      {
        kind: "additionalRate",
        measure: "taxableIncome",
        at: e.additionalRateThreshold,
        extended: true,
        ruleKey: "incomeTaxEwni",
        band: { name: "Additional", rate: e.additionalRate },
      },
    );
  }
  out.push(
    {
      kind: "taperStart",
      measure: "adjustedNetIncome",
      at: rules.ewni.personalAllowanceTaperStart,
      ruleKey: "personalAllowanceTaper",
    },
    {
      kind: "taperEnd",
      measure: "adjustedNetIncome",
      at: rules.taperEnd,
      ruleKey: "personalAllowanceTaper",
    },
    {
      kind: "niPrimaryThreshold",
      measure: "niPay",
      at: rules.ni.class1.primaryThreshold,
      ruleKey: "niClass1",
    },
    {
      kind: "niUpperEarningsLimit",
      measure: "niPay",
      at: rules.ni.class1.upperEarningsLimit,
      ruleKey: "niClass1",
    },
  );
  // Same rule as the core: several undergraduate plans are charged once over the lowest threshold, so
  // only that plan's threshold is a real change in the rate. Postgraduate is separate.
  const ugPlans = [...new Set(s.studentLoans ?? [])].filter(
    (p) => p !== "postgrad" && rules.studentLoans.plans[p],
  );
  const lowestUg = ugPlans.sort(
    (a, b) =>
      (rules.studentLoans.plans[a]?.threshold ?? 0) - (rules.studentLoans.plans[b]?.threshold ?? 0),
  )[0];
  const chargedPlans = [
    ...(lowestUg ? [lowestUg] : []),
    ...((s.studentLoans ?? []).includes("postgrad") ? (["postgrad"] as const) : []),
  ];
  for (const plan of chargedPlans) {
    const entry = rules.studentLoans.plans[plan];
    if (!entry) continue;
    out.push({
      kind: "studentLoan",
      measure: "studentLoanPay",
      at: entry.threshold,
      ruleKey: "studentLoan",
      plan,
    });
  }
  const children = Math.floor(Math.max(0, s.childBenefit?.children ?? 0) || 0);
  if (children > 0 && s.childBenefit?.claimantIsHigherEarner !== false) {
    const { hicbcThresholdStart, hicbcStepWidth } = rules.hicbc;
    out.push(
      {
        kind: "hicbcStart",
        measure: "adjustedNetIncome",
        at: hicbcThresholdStart,
        ruleKey: "hicbc",
      },
      {
        kind: "hicbcEnd",
        measure: "adjustedNetIncome",
        at: hicbcThresholdStart + 100 * hicbcStepWidth,
        ruleKey: "hicbc",
      },
    );
  }

  return out
    .map(({ extended = false, ...t }): UkIncomeThreshold => {
      const grossAt = solveGross(s, rules, t.measure, t.at, extended);
      const at = grossAt === null ? null : computeUkTakeHome(scenarioAtGross(s, grossAt));
      const src = sources[t.ruleKey];
      return {
        ...t,
        grossAt,
        aniAt: at?.adjustedNetIncome ?? null,
        bandExtension: extended && at ? roundPence(bandExtensionOf(at)) : 0,
        status: src.status,
        source: src.url,
      };
    })
    .sort(
      (a, b) => (a.grossAt ?? Number.POSITIVE_INFINITY) - (b.grossAt ?? Number.POSITIVE_INFINITY),
    );
}
