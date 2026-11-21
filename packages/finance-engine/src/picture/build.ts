import type { BudgetEntryItem } from "../ai-context-pack.js";
import { netWorthBasisFromProfile } from "../net-worth-basis.js";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "../portfolio.js";
import type { UserProfileData } from "../profile.js";
import type { TaxRecord } from "../tax-calculator.js";
import type { UkTaxYear } from "../types.js";
import type { Figure } from "./figure.js";
import { type FinancialPictureInput, profileFactsFromProfile } from "./input.js";
import {
  type BudgetAccountLinkOffer,
  findBudgetAccountLinkOffers,
} from "./selectors/account-link-offers.js";
import { type BudgetTotals, selectBudgetTotals } from "./selectors/budget-totals.js";
import { type DebtSummary, selectDebtSummary } from "./selectors/debt-summary.js";
import { type EstimatedTaxDue, selectEstimatedTaxDue } from "./selectors/estimated-tax-due.js";
import {
  type AccountFixedRateEnd,
  type HousingCost,
  type HousingPayment,
  selectFixedRateEnds,
  selectHousingCost,
  selectHousingPayment,
} from "./selectors/housing-cost.js";
import { type HousingRoom, selectHousingRoom } from "./selectors/housing-room.js";
import { selectIsaAllowanceUsed } from "./selectors/isa-allowance-used.js";
import {
  type BudgetLinkOffer,
  budgetRowLinkOf,
  type LinkedBudgetRows,
  withLinkedBudgetRows,
} from "./selectors/linked-budget-rows.js";
import { type LoanToValue, selectLoanToValue } from "./selectors/loan-to-value.js";
import { type MonthsOfCover, selectMonthsOfCover } from "./selectors/months-of-cover.js";
import { selectPensionContributionMonthly } from "./selectors/pension-contribution.js";
import {
  type DebtTotals,
  type NetWorthTotals,
  selectDebtTotals,
  selectNetWorth,
} from "./selectors/portfolio-totals.js";
import { type SafeToSpend, selectSafeToSpend } from "./selectors/safe-to-spend.js";
import { type SavingsTotals, selectSavingsTotals } from "./selectors/savings-totals.js";
import { selectTakeHome, type TakeHome, takeHomeLeavesOut } from "./selectors/take-home.js";

/**
 * The derived figures every page, loader and MCP resource shows. Built once per request from
 * saved data; a page never recomputes one of these locally (E23 section 2).
 */
export interface FinancialPicture {
  takeHome: Figure<TakeHome>;
  /**
   * The budget rows every budget figure counts: the saved rows with the linked take-home and
   * housing rows in place (owner items 7 and 33b). Pages list these, so a row and its figures agree.
   */
  budgetRows: BudgetEntryItem[];
  /** Saved rows a linked row stands in for: kept in storage, counted nowhere. */
  shadowedBudgetRowIds: string[];
  /**
   * Links the budget page offers instead of making them: the person picks the row the take-home
   * pay or the saved housing payment replaces.
   */
  budgetLinkOffers: BudgetLinkOffer[];
  /**
   * Rows that look like a copy of one account's monthly saving or payment: the budget page offers
   * a one-tap "link this line" for each, and links nothing on its own (audit slice 5).
   */
  budgetAccountLinkOffers: BudgetAccountLinkOffer[];
  /**
   * The monthly housing payment the budget's linked housing line reads (the person's own cost),
   * or null when it is not saved. The setup wizard resolves its pending rows with it.
   */
  housingPayment: HousingPayment | null;
  budget: Figure<BudgetTotals>;
  safeToSpend: Figure<SafeToSpend>;
  monthsOfCover: Figure<MonthsOfCover>;
  netWorth: NetWorthTotals;
  debt: DebtTotals;
  /** Monthly rent or mortgage payment and its share of take-home pay (E32). */
  housingCost: Figure<HousingCost>;
  /** Monthly room before housing: take-home less non-housing essentials and debt payments (E39). */
  housingRoom: Figure<HousingRoom>;
  /** Mortgage accounts with a stored fix-end date, as of the build date (E32). */
  fixedRateEnds: AccountFixedRateEnd[];
  /** Mortgage balance over the home value net worth counts (E16 PR 3). */
  loanToValue: Figure<LoanToValue>;
  /** Self assessment estimate on income outside PAYE, current tax year (C-11). */
  estimatedTaxDue: Figure<EstimatedTaxDue>;
  /** Saving and Investment accounts: balance and monthly saving at the user's share. */
  savings: SavingsTotals;
  /** Consumer debt on minimum payments only, or null when there is none. */
  debtSummary: DebtSummary | null;
  /** ISA allowance used this tax year (an estimate from monthly saving), or null. */
  isaAllowanceUsed: number | null;
  /** Estimated employee pension contribution a month from salary and percentage, or null. */
  pensionContributionMonthly: number | null;
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
  const housingPayment = selectHousingPayment(
    input.profile,
    snapshot,
    input.accounts,
    input.budget,
  );
  const linked = withLinkedBudgetRows(input.budget, {
    takeHome,
    housing: housingPayment,
    accounts: snapshot,
  });
  const budget = linked.rows;
  const safeToSpend = selectSafeToSpend(takeHome, budget, snapshot);
  const asOf = opts.asOf ?? new Date();
  return {
    takeHome,
    budgetRows: budget,
    shadowedBudgetRowIds: linked.shadowedRowIds,
    budgetLinkOffers: linked.offers,
    budgetAccountLinkOffers: findBudgetAccountLinkOffers(input.budget, snapshot),
    housingPayment,
    budget: selectBudgetTotals(budget, takeHomeLeavesOut(takeHome)),
    safeToSpend,
    monthsOfCover: selectMonthsOfCover(budget, snapshot),
    netWorth: selectNetWorth(snapshot, input.netWorthBasis),
    debt: selectDebtTotals(snapshot),
    housingCost: selectHousingCost(input.profile, takeHome, snapshot, input.accounts, input.budget),
    housingRoom: selectHousingRoom(
      { takeHome, budgetRows: budget, safeToSpend, housingPayment },
      { snapshot },
    ),
    fixedRateEnds: selectFixedRateEnds(input.accounts, asOf),
    loanToValue: selectLoanToValue(snapshot),
    estimatedTaxDue: selectEstimatedTaxDue(input.profile, input.taxRecords, {
      taxYear: opts.taxYear,
      accounts: input.accounts,
    }),
    savings: selectSavingsTotals(snapshot),
    debtSummary: selectDebtSummary(snapshot, asOf),
    isaAllowanceUsed: selectIsaAllowanceUsed(input.accounts, asOf),
    pensionContributionMonthly: selectPensionContributionMonthly(input.profile),
  };
}

/**
 * The budget with its linked lines resolved (`withLinkedBudgetRows`), for a reader that needs the
 * rows without the rest of the picture (the MCP tools). The same sources the picture uses.
 */
export function linkedBudgetRowsFor(
  input: Pick<FinancialPictureInput, "profile" | "accounts" | "details" | "budget">,
  opts: Pick<BuildFinancialPictureOptions, "taxYear" | "snapshot"> & {
    takeHome?: Figure<TakeHome>;
  } = {},
): LinkedBudgetRows {
  const snapshot = opts.snapshot ?? new PortfolioSnapshot(input.accounts, input.details);
  return withLinkedBudgetRows(input.budget, {
    takeHome: opts.takeHome ?? selectTakeHome(input.profile, { taxYear: opts.taxYear }),
    housing: selectHousingPayment(input.profile, snapshot, input.accounts, input.budget),
    accounts: snapshot,
  });
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
  ownership?: unknown;
  sharePercent?: unknown;
  linkKind?: unknown;
  linkAccountId?: unknown;
}

export interface FinancialPictureRows {
  profile?: Partial<UserProfileData> | null;
  accounts?: readonly RawAccount[] | null;
  accountDetails?: readonly RawAccountDetail[] | null;
  budgetEntries?: readonly BudgetRowLike[] | null;
  taxRecords?: readonly TaxRecord[] | null;
}

/** A stored share (1-100), or null when missing or unreadable. */
function shareFromRow(value: unknown): number | null {
  const n = typeof value === "string" && value !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
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
    ownership: row.ownership === "joint" ? "joint" : "sole",
    sharePercent: shareFromRow(row.sharePercent),
    // A linked row's stored amount is never read: the linked-rows selector resolves it.
    ...(budgetRowLinkOf(row.linkKind) ? { linkKind: budgetRowLinkOf(row.linkKind) } : {}),
    // The account a savings or debt line reads; null once that account is deleted.
    ...(typeof row.linkAccountId === "string" && row.linkAccountId !== ""
      ? { linkAccountId: row.linkAccountId }
      : {}),
  };
}

/**
 * The one row-to-input mapper. Web loaders, the backend and MCP all call this, so they cannot
 * map the same rows differently.
 */
export function financialPictureInputFromRows(rows: FinancialPictureRows): FinancialPictureInput {
  return {
    profile: profileFactsFromProfile(rows.profile),
    netWorthBasis: netWorthBasisFromProfile(rows.profile),
    accounts: Array.isArray(rows.accounts) ? [...rows.accounts] : [],
    details: Array.isArray(rows.accountDetails) ? [...rows.accountDetails] : [],
    budget: Array.isArray(rows.budgetEntries) ? rows.budgetEntries.map(budgetEntryFromRow) : [],
    taxRecords: Array.isArray(rows.taxRecords) ? [...rows.taxRecords] : [],
  };
}
