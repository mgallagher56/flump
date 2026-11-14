import type { UkTaxYear } from "../../types.js";
import type { UkIncomeScenario } from "../../uk-take-home.js";
import { toStudentLoanPlanKey } from "../../uk-tax.js";
import {
  getUkIncomeThresholds,
  type UkIncomeThreshold,
  type UkThresholdKind,
} from "../../uk-tax-thresholds.js";
import { getUkTaxYearRules, type UkStudentLoanPlanKey } from "../../uk-tax-year.js";
import { whatIfGrossChange } from "../../uk-what-if.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";
import type { FactKey, ProfileFacts } from "../input.js";
import { ASSUMED_REGION_NOTE } from "./take-home.js";

/** The next pay threshold above someone's gross pay. */
export interface NextIncomeThreshold {
  kind: UkThresholdKind;
  /** Set for student loan thresholds. */
  plan?: UkStudentLoanPlanKey;
  /** Set for band thresholds: the band that starts here. */
  band?: { name: string; rate: number };
  /** Gross pay at which it is crossed. */
  grossAt: number;
  /** grossAt minus current gross pay. */
  distance: number;
}

export interface MarginalRate {
  /** Share of the next £1,000 of gross pay that is deducted (tax, NI, student loan, charge, pension). */
  nextThousandDeductedPct: number;
  /** Take-home from the next £1,000 of gross pay. */
  takeHomeFromNextThousand: number;
  grossPay: number;
  /** Tax year whose rates were used. */
  ratesYear: UkTaxYear;
  isFallback: boolean;
  isUnverifiedEstimate: boolean;
  /** null when no threshold lies above current pay below the engine's search cap. */
  nextThreshold: NextIncomeThreshold | null;
}

export interface SelectMarginalRateOptions {
  taxYear?: UkTaxYear;
  now?: Date;
  overrides?: Partial<ProfileFacts>;
}

const NEXT = 1000;
/**
 * E31: the Personal Allowance taper is only surfaced when adjusted net income is within this much
 * below the taper start, up to the taper end (£90,000 to £125,140 in 2026/27).
 */
export const TAPER_SURFACE_WINDOW = 10_000;
const TAPER_KINDS: readonly UkThresholdKind[] = ["taperStart", "taperEnd"];
const UNDERGRADUATE_ORDER: readonly UkStudentLoanPlanKey[] = [
  "plan1",
  "plan2",
  "plan4",
  "plan5",
  "postgrad",
];

/**
 * The E25 engine scenario for saved profile facts: salary, region, pension percent (salary sacrifice
 * or net pay, as saved) and student loan plans, plus the facts still missing for it.
 */
export function incomeScenarioFromFacts(
  facts: ProfileFacts,
  opts: { taxYear?: UkTaxYear } = {},
): { scenario: UkIncomeScenario; missing: FactKey[] } {
  const missing: FactKey[] = [];
  if (facts.annualSalary === null || !(facts.annualSalary > 0)) missing.push("annualSalary");
  // The core works out PAYE pay; self-employed profits are not modelled here.
  if (facts.employmentType !== "employed") missing.push("employmentType");
  if (facts.pensionPercent === null) missing.push("pensionPercent");
  if (facts.isSalarySacrifice === null) missing.push("isSalarySacrifice");

  const picked = new Set(
    (facts.studentLoanPlans ?? [])
      .map((p) => toStudentLoanPlanKey(p))
      .filter((k): k is UkStudentLoanPlanKey => k !== undefined),
  );
  const studentLoans = UNDERGRADUATE_ORDER.filter((k) => picked.has(k));
  const pct = Math.max(0, facts.pensionPercent ?? 0);
  const scenario: UkIncomeScenario = {
    ...(opts.taxYear ? { taxYear: opts.taxYear } : {}),
    // An unanswered region is left out, so the engine labels the assumption itself.
    ...(facts.taxRegion === null
      ? {}
      : { region: facts.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES" }),
    salary: Math.max(0, facts.annualSalary ?? 0),
    // The saved method is kept even at 0%, so an extra contribution is modelled the way it is paid.
    ...(facts.isSalarySacrifice !== null
      ? {
          pension: {
            method: facts.isSalarySacrifice ? "salary-sacrifice" : "net-pay",
            pct,
          },
        }
      : {}),
    ...(studentLoans.length > 0 ? { studentLoans } : {}),
  };
  return { scenario, missing };
}

/** The first threshold above `grossPay`, from the engine's thresholds map. */
export function nextThresholdAbove(
  thresholds: readonly UkIncomeThreshold[],
  grossPay: number,
): NextIncomeThreshold | null {
  let best: UkIncomeThreshold | null = null;
  for (const t of thresholds) {
    // Under 50p away rounds to "£0 above your pay", so the next one is shown instead.
    if (t.grossAt === null || t.grossAt < grossPay + 0.5) continue;
    if (!best || (best.grossAt as number) > t.grossAt) best = t;
  }
  if (!best || best.grossAt === null) return null;
  return {
    kind: best.kind,
    ...(best.plan ? { plan: best.plan } : {}),
    ...(best.band ? { band: best.band } : {}),
    grossAt: best.grossAt,
    distance: Math.round((best.grossAt - grossPay) * 100) / 100,
  };
}

/**
 * The share of the next £1,000 of pay that is deducted, and the next threshold above current pay,
 * for saved profile facts. Unknown (naming the missing facts) rather than guessed.
 */
export function selectMarginalRate(
  facts: ProfileFacts,
  opts: SelectMarginalRateOptions = {},
): Figure<MarginalRate> {
  const f: ProfileFacts = { ...facts, ...opts.overrides };
  const { scenario, missing } = incomeScenarioFromFacts(f, { taxYear: opts.taxYear });
  if (missing.length > 0) return figureUnknown(missing, "not-set");

  const next = whatIfGrossChange(scenario, NEXT, { now: opts.now });
  const { before } = next;
  const rules = getUkTaxYearRules(before.ratesYear);
  const thresholds = getUkIncomeThresholds(rules, { ...scenario, taxYear: before.ratesYear });
  const ani = before.adjustedNetIncome;
  const taperInView =
    ani >= rules.ewni.personalAllowanceTaperStart - TAPER_SURFACE_WINDOW && ani <= rules.taperEnd;
  const assumptions = before.assumptions.some((a) => a.code === "regionAssumed")
    ? [ASSUMED_REGION_NOTE]
    : undefined;

  return figureKnown<MarginalRate>(
    {
      nextThousandDeductedPct: next.effectiveMarginalRatePct,
      takeHomeFromNextThousand: next.deltaTakeHome,
      grossPay: before.grossPay,
      ratesYear: before.ratesYear,
      isFallback: before.isFallback,
      isUnverifiedEstimate: before.isUnverifiedEstimate || next.after.isUnverifiedEstimate,
      nextThreshold: nextThresholdAbove(
        taperInView ? thresholds : thresholds.filter((t) => !TAPER_KINDS.includes(t.kind)),
        before.grossPay,
      ),
    },
    assumptions ? "assumption" : "derived",
    assumptions,
  );
}
