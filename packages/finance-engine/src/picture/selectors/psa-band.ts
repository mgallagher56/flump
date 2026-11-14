import type { UserProfileData } from "../../profile.js";
import type { UkTaxYear } from "../../types.js";
import { calculateUkTax } from "../../uk-tax.js";
import { resolveUkTaxYear, UnsupportedUkTaxYearError } from "../../uk-tax-year.js";
import type { ProfileFacts } from "../input.js";

/** The rate band that sets the Personal Savings Allowance (£1,000, £500 or £0). */
export type PsaBand = "basic" | "higher" | "additional";

function monthlyAmount(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Saved non-salary income a year: second income plus rental income. An amount only counts while
 * the user says they have that income, so a figure left behind after switching it off is ignored.
 */
export function otherAnnualIncomeFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): number {
  const p = profile ?? {};
  const second = p.hasSecondIncome === true ? monthlyAmount(p.secondIncomeMonthly) : 0;
  const rental = p.hasRentalIncome === true ? monthlyAmount(p.rentalIncomeMonthly) : 0;
  return (second + rental) * 12;
}

/**
 * The Personal Savings Allowance band for the saved income and tax region. Salary sets whether a
 * band can be claimed at all; `otherAnnualIncome` (second and rental income, see
 * `otherAnnualIncomeFromProfile`) is added on top, since it counts towards the band too. Scottish bands map to
 * basic, higher or additional for PSA purposes (the engine's marginal band does this). Returns
 * null when income is not saved, so callers never claim a band the user has not told us about.
 */
export function selectPsaBand(
  facts: ProfileFacts,
  opts: { taxYear?: UkTaxYear; otherAnnualIncome?: number } = {},
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
    bonusOrSideIncome: Math.max(0, opts.otherAnnualIncome ?? 0),
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
