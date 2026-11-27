import { selectBudgetFigures } from "./picture/budget-figures.js";
import { type BudgetRowLike, budgetEntryFromRow } from "./picture/budget-rows.js";
import type { Figure } from "./picture/figure.js";
import { profileFactsFromProfile } from "./picture/input.js";
import { type BudgetTotals, budgetRowMonthly } from "./picture/selectors/budget-totals.js";
import type { BudgetRowLink } from "./picture/selectors/linked-budget-rows.js";
import { selectConsumerDebtTotal } from "./picture/selectors/portfolio-totals.js";
import type { TakeHome } from "./picture/selectors/take-home.js";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "./portfolio.js";
import type { UserProfileData } from "./profile.js";
import type { UkTaxYear } from "./types.js";
import {
  getUkCalendarDate,
  getUkTaxYearContext,
  getUkTaxYearForDate,
  type UkTaxYearContext,
  UnsupportedUkTaxYearError,
} from "./uk-tax-year-calendar.js";

/**
 * Home's two-figure strip (E12 S5b): what is left over each month, then what the person owes or,
 * with no debt, their pension pots. Web's dashboard and the mobile app's Home both call
 * `selectHomeStrip`, so they show the same cards and refusals. Facts and figures only: the words
 * live with each app's copy.
 */

/** The budget facts the strip's first card reads. */
export type HomeStripBudget =
  | {
      status: "known";
      /** Budgeted income a month, or null when unreadable. */
      income: number | null;
      /** Income less outgoings less savings, or null when unreadable. */
      surplus: number | null;
      hasIncome: boolean;
      hasSpending: boolean;
      /** What income and left over leave out (a refused student loan plan), or null. */
      leavesOut: string | null;
    }
  | { status: "unknown" }
  /** Unknown only because the linked take-home is refused: the notice to show instead. */
  | { status: "refused"; notice: string };

export interface HomeStripFacts {
  budget: HomeStripBudget;
  /** Owed on cards, loans and overdrafts (`selectConsumerDebtTotal`), or null. */
  consumerDebt: number | null;
  /** The pension pots total when the person has a pension account, otherwise null. */
  pensionPot: number | null;
  /**
   * Today's rates context when the budget counts a worked-out take-home line, otherwise null or
   * absent. The strip's rates notice reads it.
   */
  takeHomeRates?: UkTaxYearContext | null;
}

/** The first card: left over, short, income only, not set, or refused with its notice. */
export type HomeStripFirstCell =
  | { kind: "leftOver" | "short"; figure: number; leavesOut: string | null }
  | { kind: "incomeOnly"; figure: number; leavesOut: string | null }
  | { kind: "unset" }
  | { kind: "refused"; notice: string };

/** The second card: what the person owes, their pension pots, or no card. */
export type HomeStripSecondCell =
  | { kind: "owed"; figure: number }
  | { kind: "pension"; figure: number }
  | { kind: "none" };

export interface HomeStrip {
  first: HomeStripFirstCell;
  second: HomeStripSecondCell;
  /**
   * True when half or more of the cards are not set: one "add your budget" prompt then stands in
   * for the whole strip (KpiStrip's rule, P3.2). A refused card shows its notice, so it is not
   * counted as not set; web's strip still shows its prompt there, a recorded difference until the
   * mobile Budget card (S10) explains the refusal.
   */
  collapsed: boolean;
  /**
   * The rates context to state beside the strip, when a shown figure counts a worked-out take-home
   * and the rates are a fallback or provisional (when web's TaxRatesStatusBanner shows); else null.
   */
  ratesNotice: UkTaxYearContext | null;
}

/**
 * Whether the budget holds spending. Only a real amount counts: the £0 suggested rows the set-up
 * seeds, and empty rows, are not spending, so left over is never the whole income by accident.
 * `rows` are the saved rows as stored (a linked line's stored amount counts here too).
 */
export function budgetHasSpending(
  totals: Pick<BudgetTotals, "outgoings" | "savings"> | null,
  rows: readonly (BudgetRowLike | null | undefined)[] | null | undefined,
): boolean {
  if ((totals?.outgoings ?? 0) > 0 || (totals?.savings ?? 0) > 0) return true;
  return (
    Array.isArray(rows) &&
    rows.some((row) => row != null && !row.isIncome && Number(row.amount) > 0)
  );
}

/** Left over each month, or null without an income row (it would only be minus the spending). */
export function budgetSurplusOrNull(
  totals: Pick<BudgetTotals, "hasIncome" | "surplus"> | null,
): number | null {
  return totals?.hasIncome ? totals.surplus : null;
}

/** What the budget's income and left over leave out, as one line, or null. */
export function budgetLeavesOut(budget: Figure<BudgetTotals>): string | null {
  return budget.status === "known" ? (budget.assumptions?.join(" ") ?? null) : null;
}

interface LinkedRowLike {
  linked?: BudgetRowLink;
  notSet?: boolean;
}

/**
 * The notice when the budget is unknown only because its linked take-home line is refused (the
 * year's rates for this person are not published), or null.
 */
export function budgetRefusalNotice(input: {
  budget: Figure<BudgetTotals>;
  takeHome: Figure<TakeHome>;
  budgetRows: readonly LinkedRowLike[];
}): string | null {
  const { budget, takeHome, budgetRows } = input;
  if (budget.status === "known" || takeHome.status === "known") return null;
  if (takeHome.reason !== "rates-not-published") return null;
  if (!budgetRows.some((row) => row.linked === "take_home" && row.notSet)) return null;
  return takeHome.notice ?? null;
}

/** True when the budget counts a worked-out take-home line (one read from the saved salary). */
export function budgetCountsWorkedOutTakeHome(
  takeHome: Figure<TakeHome>,
  budgetRows: readonly Parameters<typeof budgetRowMonthly>[0][],
): boolean {
  if (takeHome.status !== "known" || takeHome.value.basis !== "worked-out") return false;
  return budgetRows.some(
    (row) =>
      (row as LinkedRowLike).linked === "take_home" &&
      !(row as LinkedRowLike).notSet &&
      budgetRowMonthly(row) > 0,
  );
}

/**
 * The strip's budget facts from the budget's figures: the linked rows the totals count, the saved
 * rows as stored, and the take-home.
 */
export function homeStripBudget(input: {
  budget: Figure<BudgetTotals>;
  takeHome: Figure<TakeHome>;
  budgetRows: readonly (Parameters<typeof budgetRowMonthly>[0] & LinkedRowLike)[];
  savedRows: readonly (BudgetRowLike | null | undefined)[] | null | undefined;
}): HomeStripBudget {
  const { budget } = input;
  if (budget.status !== "known") {
    const notice = budgetRefusalNotice(input);
    return notice === null ? { status: "unknown" } : { status: "refused", notice };
  }
  return {
    status: "known",
    income: budget.value.income,
    surplus: budget.value.surplus,
    hasIncome: budget.value.hasIncome,
    hasSpending: budgetHasSpending(budget.value, input.savedRows),
    leavesOut: budgetLeavesOut(budget),
  };
}

function firstCell(budget: HomeStripBudget): HomeStripFirstCell {
  if (budget.status === "refused") return { kind: "refused", notice: budget.notice };
  if (budget.status === "unknown") return { kind: "unset" };
  // Straight after onboarding the budget can hold income and no spending: show the income and
  // ask for spending, never income minus nothing as "left over".
  if (budget.hasIncome && !budget.hasSpending && budget.income !== null) {
    return { kind: "incomeOnly", figure: budget.income, leavesOut: budget.leavesOut };
  }
  const surplus =
    budget.surplus === null
      ? null
      : budgetSurplusOrNull({ hasIncome: budget.hasIncome, surplus: budget.surplus });
  if (surplus === null) return { kind: "unset" };
  return { kind: surplus < 0 ? "short" : "leftOver", figure: surplus, leavesOut: budget.leavesOut };
}

function secondCell(consumerDebt: number | null, pensionPot: number | null): HomeStripSecondCell {
  if (consumerDebt !== null && consumerDebt > 0) return { kind: "owed", figure: consumerDebt };
  if (pensionPot !== null) return { kind: "pension", figure: pensionPot };
  return { kind: "none" };
}

/** True when the rates in use are not the calendar year's confirmed ones. */
function ratesNeedNotice(rates: UkTaxYearContext): boolean {
  return rates.isFallback || rates.kind === "provisional" || rates.ratesYear !== rates.calendarYear;
}

/** Home's strip from its facts: the one rule web and mobile share. */
export function selectHomeStrip(facts: HomeStripFacts): HomeStrip {
  const first = firstCell(facts.budget);
  const second = secondCell(facts.consumerDebt, facts.pensionPot);
  const cards = second.kind === "none" ? 1 : 2;
  const unset = first.kind === "unset" ? 1 : 0;
  const collapsed = unset * 2 >= cards;
  const rates = facts.takeHomeRates ?? null;
  const showsFigure = first.kind !== "unset" && first.kind !== "refused";
  return {
    first,
    second,
    collapsed,
    ratesNotice: showsFigure && rates !== null && ratesNeedNotice(rates) ? rates : null,
  };
}

/** Today's rates context, or null before the earliest supported year. */
function ratesContextOn(today: Date): UkTaxYearContext | null {
  try {
    return getUkTaxYearContext(today);
  } catch (error) {
    if (error instanceof UnsupportedUkTaxYearError) return null;
    throw error;
  }
}

/** The saved rows the mobile app reads, as the API returns them. */
export interface HomeStripRows {
  accounts?: readonly RawAccount[] | null;
  details?: readonly RawAccountDetail[] | null;
  budgetEntries?: readonly (BudgetRowLike | null | undefined)[] | null;
  profile?: Partial<UserProfileData> | null;
  /** The date the take-home's tax year is read from. */
  today: Date;
}

/**
 * Home's strip straight from the saved rows, for the mobile app: the same budget figures
 * `buildFinancialPicture` works out (`selectBudgetFigures`), the consumer debt total and the
 * pension pots, then `selectHomeStrip`. The caller does no sums.
 */
export function selectHomeStripFromRows(rows: HomeStripRows): HomeStrip {
  const accounts = Array.isArray(rows.accounts) ? [...rows.accounts] : [];
  const details = Array.isArray(rows.details) ? [...rows.details] : [];
  const saved = Array.isArray(rows.budgetEntries) ? rows.budgetEntries : [];
  const snapshot = new PortfolioSnapshot(accounts, details);
  const rates = ratesContextOn(rows.today);
  // The year the take-home uses today. Before the earliest supported year the calendar year is
  // passed as it is, so the take-home reads "unsupported year", as the picture does on that date.
  const taxYear = (rates?.ratesYear ??
    getUkTaxYearForDate(getUkCalendarDate(rows.today))) as UkTaxYear;
  const figures = selectBudgetFigures(
    {
      profile: profileFactsFromProfile(rows.profile),
      accounts,
      budget: saved.flatMap((row, index) => (row == null ? [] : [budgetEntryFromRow(row, index)])),
    },
    snapshot,
    { taxYear },
  );
  return selectHomeStrip({
    budget: homeStripBudget({
      budget: figures.budget,
      takeHome: figures.takeHome,
      budgetRows: figures.linked.rows,
      savedRows: saved,
    }),
    consumerDebt: selectConsumerDebtTotal(snapshot),
    pensionPot: accounts.some((a) => a.type === "Pension") ? snapshot.getTotalPensions() : null,
    takeHomeRates: budgetCountsWorkedOutTakeHome(figures.takeHome, figures.linked.rows)
      ? rates
      : null,
  });
}
