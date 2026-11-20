import type { UkTaxYear } from "../../types.js";
import { calculateUkTax } from "../../uk-tax.js";
import {
  getUkTaxYearRules,
  resolveUkTaxYear,
  scottishRatesRefusal,
  UnsupportedUkTaxYearError,
} from "../../uk-tax-year.js";
import type { ProfileFacts } from "../input.js";

/** The rate band that sets the Personal Savings Allowance (£1,000, £500 or £0). */
export type PsaBand = "basic" | "higher" | "additional";

/**
 * The Personal Savings Allowance band for the saved income and tax region. Salary sets whether a
 * band can be claimed at all; `otherAnnualIncome` (any saved non-salary income a year, which the
 * caller works out) is added on top, since it counts towards the band too. Scottish bands map to
 * basic, higher or additional for PSA purposes (the engine's marginal band does this). Returns
 * null when income is not saved, so callers never claim a band the user has not told us about.
 */
export function selectPsaBand(
  facts: ProfileFacts,
  opts: { taxYear?: UkTaxYear; otherAnnualIncome?: number } = {},
): PsaBand | null {
  if (facts.annualSalary === null || !(facts.annualSalary > 0)) return null;
  // The pension can move the band near a threshold, so an unset rate leaves it unknown (slice 6).
  if (facts.pensionPercent === null) return null;
  let taxYear: UkTaxYear;
  try {
    taxYear = resolveUkTaxYear(opts.taxYear);
  } catch (error) {
    if (error instanceof UnsupportedUkTaxYearError) return null;
    throw error;
  }
  const region = facts.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES";
  // Refused (no Scottish rates for the year): no band, never a carried-forward one.
  if (scottishRatesRefusal(getUkTaxYearRules(taxYear), region)) return null;
  const result = calculateUkTax({
    grossSalary: facts.annualSalary,
    bonusOrSideIncome: Math.max(0, opts.otherAnnualIncome ?? 0),
    pensionContributionPct: facts.pensionPercent,
    isSalarySacrifice: facts.employmentType !== "self-employed" && facts.isSalarySacrifice === true,
    region,
    taxYear,
  });
  switch (result.allowances.marginalIncomeTaxBand) {
    case "ADDITIONAL":
      return "additional";
    case "HIGHER":
      return "higher";
    default:
      return "basic";
  }
}
