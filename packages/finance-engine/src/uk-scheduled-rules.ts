/**
 * Future-dated rules (E25-T7). Announced policy that is not yet a supported tax year.
 *
 * A scheduled rule is applied only when a scenario asks for it by id (`UkIncomeScenario.scheduledRules`),
 * never implicitly, and every result that uses one carries the "scheduledRuleIllustration" assumption so
 * the UI labels it as an illustration at the current rates year. Status stays "announced-provisional"
 * until Royal Assent and the secondary legislation; the owner rechecks it before each release (E25 plan,
 * OWNER STEPS 3).
 */

export type UkScheduledRuleId = "ni.salarySacrificePensionCap2029";

export interface UkScheduledRule {
  id: UkScheduledRuleId;
  /** ISO date the rule is announced to take effect from. */
  effectiveFrom: string;
  status: "announced-provisional";
  /** Salary sacrifice into a pension above this many pounds a year stays liable to NI. */
  capGbp: number;
  /** GOV.UK policy paper the figure was read from. */
  source: string;
  /** Always "UNVERIFIED: ..." while the rule is provisional. */
  note: string;
}

export const UK_SCHEDULED_RULES: Record<UkScheduledRuleId, UkScheduledRule> = {
  "ni.salarySacrificePensionCap2029": {
    id: "ni.salarySacrificePensionCap2029",
    effectiveFrom: "2029-04-06",
    status: "announced-provisional",
    capGbp: 2000,
    source:
      "https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029",
    note: "UNVERIFIED: announced policy, not yet in secondary legislation. Employee and employer NI apply to pension salary sacrifice above 2,000 a year; the student loan treatment is not yet known and is left unchanged.",
  },
};

export const UK_SCHEDULED_RULE_IDS: readonly UkScheduledRuleId[] = Object.keys(
  UK_SCHEDULED_RULES,
) as UkScheduledRuleId[];

/** Sacrifice above the 2029 cap, which the rule adds back to NI-able pay. Never negative. */
export function salarySacrificeAboveCap(sacrifice: number, rule: UkScheduledRule): number {
  return Math.max(0, (Number.isFinite(sacrifice) ? sacrifice : 0) - rule.capGbp);
}
