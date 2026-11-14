import type { UkTaxYear } from "../../types.js";
import { calculateUkTax } from "../../uk-tax.js";
import { resolveUkTaxYear, UnsupportedUkTaxYearError } from "../../uk-tax-year.js";
import type { ProfileFacts } from "../input.js";

/** The rate band that sets the Personal Savings Allowance (£1,000, £500 or £0). */
export type PsaBand = "basic" | "higher" | "additional";

/**
 * The Personal Savings Allowance band for the saved income and tax region. Scottish bands map to
 * basic, higher or additional for PSA purposes (the engine's marginal band does this). Returns
 * null when income is not saved, so callers never claim a band the user has not told us about.
 */
export function selectPsaBand(
  facts: ProfileFacts,
  opts: { taxYear?: UkTaxYear } = {},
): PsaBand | null {
  if (facts.annualSalary === null || !(facts.annualSalary > 0)) return null;
  let taxYear: UkTaxYear;
  try {
    taxYear = resolveUkTaxYear(opts.taxYear);
  } catch (error) {
    if (error instanceof UnsupportedUkTaxYearError) return null;
    throw error;
  }
  const result = calculateUkTax({
    grossSalary: facts.annualSalary,
    pensionContributionPct: facts.pensionPercent ?? 0,
    isSalarySacrifice: facts.employmentType !== "self-employed" && facts.isSalarySacrifice === true,
    region: facts.taxRegion === "SCOTLAND" ? "SCOTLAND" : "ENGLAND_NI_WALES",
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
