import type { BudgetEntryItem } from "../ai-context-pack.js";
import type { NetWorthBasis } from "../net-worth-basis.js";
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
   * Monthly take-home pay as the person typed it (onboarding's take-home option, owner decision 2
   * option A), or null. Used by selectTakeHome only when no salary is saved; it is net pay, so no
   * tax is worked out from it. Optional so callers that only build salary facts need not list it.
   */
  monthlyTakeHome?: number | null;
  /**
   * How the pension is paid, when known. Optional: no saved profile field holds it yet, so it is
   * set only by callers that ask the person. When absent, `isSalarySacrifice` decides between
   * salary sacrifice and a net pay arrangement.
   */
  pensionMethod?: "salary-sacrifice" | "net-pay" | "relief-at-source" | null;
  /**
   * E32 housing facts. Optional so callers that only build take-home facts need not list them;
   * profileFactsFromProfile always sets them, null when unanswered.
   */
  housingStatus?: "renting" | "mortgage" | "own_outright" | "living_with_family" | null;
  /** Saved monthly rent (renters) or mortgage payment (owners), as the user entered it. */
  monthlyHousingCost?: number | null;
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
  /**
   * A budget line linked to an account whose monthly amount is not saved, or whose account was
   * deleted or is no longer a savings or debt account (audit slice 5).
   */
  | "linkedAccountMonthly"
  /** A stored mortgage balance, rate and term (E32 housing cost). */
  | "mortgageDetails"
  /** A mortgage account with a balance (loan to value). */
  | "mortgageBalance"
  /** A residential Property account with a value (loan to value). */
  | "homeValue"
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
  /** What net worth counts (the user's choices; DEFAULT_NET_WORTH_BASIS when unset). */
  netWorthBasis: NetWorthBasis;
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

const positiveOrNull = (n: number | null): number | null => (n !== null && n > 0 ? n : null);

const REGIONS = ["ENGLAND", "WALES", "SCOTLAND", "NORTHERN_IRELAND"] as const;
const EMPLOYMENT = ["employed", "self-employed", "other"] as const;
const HOUSING = ["renting", "mortgage", "own_outright", "living_with_family"] as const;

/**
 * The stored salary sacrifice flag, or null when it was never answered. The column is nullable
 * with no default (owner decision 3, slice 6), so a stored value is always the user's own answer,
 * including false (the net pay method onboarding saves) and true.
 */
export function salarySacrificeFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): boolean | null {
  const value = profile?.isSalarySacrifice;
  return typeof value === "boolean" ? value : null;
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
    monthlyTakeHome: positiveOrNull(toNumber(p.monthlyTakeHome)),
    housingStatus: HOUSING.find((h) => h === p.housingStatus) ?? null,
    monthlyHousingCost: toNumber(p.monthlyHousingCost),
    propertyOwnershipShare: toNumber(p.propertyOwnershipShare),
  };
}
