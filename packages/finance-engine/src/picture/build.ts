import type { BudgetEntryItem } from "../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "../portfolio.js";
import type { UserProfileData } from "../profile.js";
import type { UkTaxYear } from "../types.js";
import type { Figure } from "./figure.js";
import { type FinancialPictureInput, profileFactsFromProfile } from "./input.js";
import { type BudgetTotals, selectBudgetTotals } from "./selectors/budget-totals.js";
import {
  type AccountFixedRateEnd,
  type HousingCost,
  selectFixedRateEnds,
  selectHousingCost,
} from "./selectors/housing-cost.js";
import { type MonthsOfCover, selectMonthsOfCover } from "./selectors/months-of-cover.js";
import {
  type DebtTotals,
  type NetWorthTotals,
  selectDebtTotals,
  selectNetWorth,
} from "./selectors/portfolio-totals.js";
import { type SafeToSpend, selectSafeToSpend } from "./selectors/safe-to-spend.js";
import { selectTakeHome, type TakeHome } from "./selectors/take-home.js";

/**
 * The derived figures every page, loader and MCP resource shows. Built once per request from
 * saved data; a page never recomputes one of these locally (E23 section 2).
 */
export interface FinancialPicture {
  takeHome: Figure<TakeHome>;
  budget: Figure<BudgetTotals>;
  safeToSpend: Figure<SafeToSpend>;
  monthsOfCover: Figure<MonthsOfCover>;
  netWorth: NetWorthTotals;
  debt: DebtTotals;
  /** Monthly rent or mortgage payment and its share of take-home pay (E32). */
  housingCost: Figure<HousingCost>;
  /** Mortgage accounts with a stored fix-end date, as of the build date (E32). */
  fixedRateEnds: AccountFixedRateEnd[];
}

export interface BuildFinancialPictureOptions {
  taxYear?: UkTaxYear;
  /** Reuse a snapshot the caller already built from the same rows. */
  snapshot?: PortfolioSnapshot;
  /** The date date-based facts are measured from. Defaults to now; pass a fixed date in tests. */
  asOf?: Date;
}

export function buildFinancialPicture(
  input: FinancialPictureInput,
  opts: BuildFinancialPictureOptions = {},
): FinancialPicture {
  const snapshot = opts.snapshot ?? new PortfolioSnapshot(input.accounts, input.details);
  const takeHome = selectTakeHome(input.profile, { taxYear: opts.taxYear });
  return {
    takeHome,
    budget: selectBudgetTotals(input.budget),
    safeToSpend: selectSafeToSpend(takeHome, input.budget, snapshot),
    monthsOfCover: selectMonthsOfCover(input.budget, snapshot),
    netWorth: selectNetWorth(snapshot),
    debt: selectDebtTotals(snapshot),
    housingCost: selectHousingCost(input.profile, takeHome, snapshot, input.accounts),
    fixedRateEnds: selectFixedRateEnds(input.accounts, opts.asOf ?? new Date()),
  };
}

/** A budget row as any caller holds it: API JSON, a TypeORM entity or a fixture. */
export interface BudgetRowLike {
  id?: unknown;
  category?: unknown;
  name?: unknown;
  amount?: unknown;
  frequency?: unknown;
  isIncome?: unknown;
  isEssential?: unknown;
}

export interface FinancialPictureRows {
  profile?: Partial<UserProfileData> | null;
  accounts?: readonly RawAccount[] | null;
  accountDetails?: readonly RawAccountDetail[] | null;
  budgetEntries?: readonly BudgetRowLike[] | null;
}

/** Maps one budget row. Unreadable amounts become 0; a missing frequency means monthly. */
export function budgetEntryFromRow(row: BudgetRowLike, index = 0): BudgetEntryItem {
  const amount = Number(row.amount);
  return {
    id: typeof row.id === "string" && row.id !== "" ? row.id : `budget-${index}`,
    category: typeof row.category === "string" ? row.category : "",
    name: typeof row.name === "string" ? row.name : "",
    amount: Number.isFinite(amount) ? amount : 0,
    frequency:
      typeof row.frequency === "string" && row.frequency !== "" ? row.frequency : "monthly",
    isIncome: row.isIncome === true,
    isEssential: row.isEssential === true,
  };
}

/**
 * The one row-to-input mapper. Web loaders, the backend and MCP all call this, so they cannot
 * map the same rows differently.
 */
export function financialPictureInputFromRows(rows: FinancialPictureRows): FinancialPictureInput {
  return {
    profile: profileFactsFromProfile(rows.profile),
    accounts: Array.isArray(rows.accounts) ? [...rows.accounts] : [],
    details: Array.isArray(rows.accountDetails) ? [...rows.accountDetails] : [],
    budget: Array.isArray(rows.budgetEntries) ? rows.budgetEntries.map(budgetEntryFromRow) : [],
  };
}
