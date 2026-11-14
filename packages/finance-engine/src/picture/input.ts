import type { BudgetEntryItem } from "../ai-context-pack.js";
import type { RawAccount, RawAccountDetail } from "../portfolio.js";
import type { UserProfileData } from "../profile.js";

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
  | "mortgageDetails";

/**
 * The saved rows one user's financial picture is built from (E23 section 2.1). Saved data only:
 * scenario inputs never go in here.
 */
export interface FinancialPictureInput {
  profile: ProfileFacts;
  accounts: RawAccount[];
  details: RawAccountDetail[];
  budget: BudgetEntryItem[];
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

/** Maps a stored profile to facts. Never invents a default: unanswered stays null. */
export function profileFactsFromProfile(
  profile: Partial<UserProfileData> | null | undefined,
): ProfileFacts {
  const p = profile ?? {};
  const taxRegion = REGIONS.find((r) => r === p.taxRegion) ?? null;
  const employmentType = EMPLOYMENT.find((e) => e === p.employmentType) ?? null;
  const isSalarySacrifice = typeof p.isSalarySacrifice === "boolean" ? p.isSalarySacrifice : null;
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
  };
}
