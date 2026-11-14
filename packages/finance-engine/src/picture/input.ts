import type { BudgetEntryItem } from "../ai-context-pack.js";
import type { RawAccount, RawAccountDetail } from "../portfolio.js";
import type { UserProfileData } from "../profile.js";
import type { TaxRecord } from "../tax-calculator.js";

export interface ProfileFacts {
  annualSalary: number | null;
  employmentType: "employed" | "self-employed" | "other" | null;
  taxRegion: "ENGLAND" | "WALES" | "SCOTLAND" | "NORTHERN_IRELAND" | null;
  /** [] means no student loan; null means not answered. */
  studentLoanPlans: string[] | null;
  pensionPercent: number | null;
  isSalarySacrifice: boolean | null;
  /**
   * E32 housing facts. Optional so callers that only build take-home facts need not list them;
   * profileFactsFromProfile always sets them, null when unanswered.
   */
  housingStatus?: "renting" | "mortgage" | "own_outright" | null;
  /** Saved monthly rent (renters) or mortgage payment (owners), as the user entered it. */
  monthlyHousingCost?: number | null;
  mortgageType?: "repayment" | "interest-only" | null;
  /**
   * D3 (E16): the user's own estimate of their home's value, counted at 100% in net worth as
   * "Home (your estimate)" when no Property account holds the home. null when not given.
   */
  homeValue?: number | null;
  /** Share of rental property the user owns, in percent (self assessment). null means 100%. */
  propertyOwnershipShare?: number | null;
}

export type FactKey = keyof ProfileFacts;

/**
 * Everything a figure can be missing: a profile fact, or a kind of saved row. "budget" means no
 * budget rows at all; "budgetIncome" and "budgetEssentials" mean no row of that kind.
 */
export type MissingKey =
  | FactKey
  | "budget"
  | "budgetIncome"
  | "budgetEssentials"
  /** A stored mortgage balance, rate and term (E32 housing cost). */
  | "mortgageDetails"
  /** A mortgage account with a balance (loan to value). */
  | "mortgageBalance"
  /** Income records not taxed through PAYE (rental, self-employed, savings, dividends). */
  | "untaxedIncomeRecords"
  /** Self-employed income records (a self-employed user's trading income, estimated tax due). */
  | "selfEmploymentRecords";

/**
 * The saved rows one user's financial picture is built from (E23 section 2.1). Saved data only:
 * scenario inputs never go in here.
 */
export interface FinancialPictureInput {
  profile: ProfileFacts;
  accounts: RawAccount[];
  details: RawAccountDetail[];
  budget: BudgetEntryItem[];
  /** Self-assessment records (estimated tax due). Optional: absent means none saved. */
  taxRecords?: TaxRecord[];
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return null;
}

const REGIONS = ["ENGLAND", "WALES", "SCOTLAND", "NORTHERN_IRELAND"] as const;
const EMPLOYMENT = ["employed", "self-employed", "other"] as const;
const HOUSING = ["renting", "mortgage", "own_outright"] as const;
const MORTGAGE_TYPES = ["repayment", "interest-only"] as const;

/**
 * True when the stored pension rates are still the backend's row-creation defaults (5% employee,
 * 3% employer), which the user may never have chosen. There is no "set by the user" flag, so
 * this exact pair is the only signal (the same heuristic the pension page uses).
 */
export function hasDefaultPensionRates(
  profile: Partial<UserProfileData> | null | undefined,
): boolean {
  const p = profile ?? {};
  return toNumber(p.pensionPercent) === 5 && toNumber(p.pensionEmployerPercent) === 3;
}

/**
 * The stored salary sacrifice flag, or null when it cannot be taken as the user's choice.
 * `is_salary_sacrifice` is NOT NULL and used to default to true, so older rows carry `true`
 * the user never chose. Rows are not backfilled (owner decision); instead a stored `true`
 * alongside the untouched default pension rates is read as not set. A stored `false` is the
 * new default and the net pay method, the one onboarding saves, so it is kept.
 */
export function salarySacrificeFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): boolean | null {
  const value = profile?.isSalarySacrifice;
  if (typeof value !== "boolean") return null;
  if (value && hasDefaultPensionRates(profile)) return null;
  return value;
}

/** Maps a stored profile to facts. Never invents a default: unanswered stays null. */
export function profileFactsFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): ProfileFacts {
  const p = profile ?? {};
  const taxRegion = REGIONS.find((r) => r === p.taxRegion) ?? null;
  const employmentType = EMPLOYMENT.find((e) => e === p.employmentType) ?? null;
  const isSalarySacrifice = salarySacrificeFromProfile(p);
  let studentLoanPlans: string[] | null = null;
  if (Array.isArray(p.studentLoanPlans)) {
    studentLoanPlans = p.studentLoanPlans.filter((x) => typeof x === "string" && x.trim() !== "");
  } else if (typeof p.studentLoanPlan === "string" && p.studentLoanPlan.trim() !== "") {
    // Legacy single-plan column; "NONE" means the user said they have no loan.
    studentLoanPlans = p.studentLoanPlan.trim().toUpperCase() === "NONE" ? [] : [p.studentLoanPlan];
  }
  return {
    annualSalary: toNumber(p.annualSalary),
    employmentType,
    taxRegion,
    studentLoanPlans,
    pensionPercent: toNumber(p.pensionPercent),
    isSalarySacrifice,
    housingStatus: HOUSING.find((h) => h === p.housingStatus) ?? null,
    monthlyHousingCost: toNumber(p.monthlyHousingCost),
    mortgageType: MORTGAGE_TYPES.find((t) => t === p.mortgageType) ?? null,
    homeValue: toNumber(p.homeValue),
    propertyOwnershipShare: toNumber(p.propertyOwnershipShare),
  };
}
