import type { BudgetEntryItem } from "./ai-context-pack.js";
import { budgetCountsWorkedOutTakeHome } from "./home-strip.js";
import { selectBudgetFigures } from "./picture/budget-figures.js";
import { type BudgetRowLike, budgetEntryFromRow } from "./picture/budget-rows.js";
import { type Figure, isFigureKnown } from "./picture/figure.js";
import { profileFactsFromProfile } from "./picture/input.js";
import {
  type BudgetTotals,
  budgetRowMonthly,
  DEBT_CATEGORY,
} from "./picture/selectors/budget-totals.js";
import {
  accountFitsBudgetLink,
  type BudgetAccountLink,
  type BudgetRowLink,
  isBudgetAccountLink,
} from "./picture/selectors/linked-budget-rows.js";
import {
  type MonthsOfCover,
  monthsOfCoverFor,
  selectMonthsOfCover,
} from "./picture/selectors/months-of-cover.js";
import { type SafeToSpend, selectSafeToSpend } from "./picture/selectors/safe-to-spend.js";
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
 * The Budget page's figures and rules (E12 S10): the sums and decisions web's Budget page made
 * outside the engine, moved here so web and the mobile app's Budget tab call one function each.
 * Facts and figures only: the words stay with each app's copy.
 */

/** Money in, not somewhere money goes: shown once, as "Money in". */
export const INCOME_CATEGORY = "income";

/** The categories every budget page lists first, in this order. */
export const STANDARD_BUDGET_CATEGORIES: readonly string[] = [
  "housing",
  "bills",
  "expenses",
  "savings",
  INCOME_CATEGORY,
];

/** A budget row as the page holds it: a saved row, or a linked line the engine made. */
export interface BudgetPageEntry {
  id: string;
  category: string;
  amount: number;
  frequency: string;
  isIncome: boolean;
  isEssential: boolean;
  ownership?: string | null;
  sharePercent?: number | null;
  linked?: BudgetRowLink;
  linkAccountId?: string | null;
  notSet?: boolean;
}

/**
 * The one income predicate for the budget page: an entry is income when it is flagged as income
 * or sits in the "income" category, whatever its flag.
 */
export function isIncomeEntry(entry: { isIncome: boolean; category: string }): boolean {
  return entry.isIncome || entry.category === INCOME_CATEGORY;
}

/** True when a category holds nothing but income, so a stray spending row never hides. */
export function isIncomeCategory(
  category: string,
  entries: readonly { isIncome: boolean; category: string }[],
): boolean {
  const inCategory = entries.filter((e) => e.category === category);
  if (inCategory.some((e) => !isIncomeEntry(e))) return false;
  return category === INCOME_CATEGORY || inCategory.length > 0;
}

/** An entry's monthly figure as a list shows it: its monthly amount at the person's share. */
export function budgetEntryShownMonthly(
  entry: Pick<BudgetPageEntry, "amount" | "frequency" | "ownership" | "sharePercent">,
): number {
  return Math.abs(budgetRowMonthly(entry));
}

/** The page's categories: the standard ones, then the person's own, then any an entry sits in. */
export function budgetPageCategories(
  customCategories: readonly string[],
  entries: readonly { category: string }[],
): string[] {
  const fromEntries = entries
    .map((e) => e.category)
    .filter((c) => !STANDARD_BUDGET_CATEGORIES.includes(c));
  return Array.from(new Set([...STANDARD_BUDGET_CATEGORIES, ...customCategories, ...fromEntries]));
}

/** One category in "Where your money goes". */
export interface BudgetCategoryRank {
  category: string;
  /** The known lines' monthly total. Not shown when `notSet`. */
  total: number;
  count: number;
  /** True when a linked line in it is not set: its total is unknown, shown as "Not set". */
  notSet: boolean;
}

/**
 * Where the money goes: categories ranked by their monthly amount, largest first, ties in the
 * order given. Income categories are left out. A category with no amount (no entries, or only £0
 * ones) is left out too, unless `keepEmpty` (the editor keeps them, so they can be filled in).
 */
export function rankBudgetCategories(
  categories: readonly string[],
  entries: readonly BudgetPageEntry[],
  options: { keepEmpty?: boolean } = {},
): BudgetCategoryRank[] {
  const all = Array.from(new Set([...categories, ...entries.map((e) => e.category)])).filter(
    (category) => !isIncomeCategory(category, entries),
  );
  const ranked = all
    .map((category, index) => {
      const inCategory = entries.filter((e) => e.category === category && !isIncomeEntry(e));
      const notSet = inCategory.some((e) => e.notSet === true);
      // A linked line that is not set has no figure: never added as £0.
      const total = inCategory
        .filter((e) => e.notSet !== true)
        .reduce((s, e) => s + budgetEntryShownMonthly(e), 0);
      return {
        index,
        row: {
          category,
          total: Number.isFinite(total) ? total : 0,
          count: inCategory.length,
          notSet,
        },
      };
    })
    .sort((a, b) => b.row.total - a.row.total || a.index - b.index)
    .map(({ row }) => row);
  return options.keepEmpty
    ? ranked
    : ranked.filter((row) => row.notSet || Math.round(row.total) > 0);
}

/**
 * How an opened category shows one entry: a not-set line has no figure; with one entry the row's
 * own total already says it, so only the name shows; otherwise the entry's monthly figure.
 */
export type BudgetCategoryEntryFigure =
  | { kind: "notSet" }
  | { kind: "nameOnly" }
  | { kind: "amount"; monthly: number };

/** An opened category's entries (income left out), each with how its figure shows. */
export function budgetCategoryEntries<E extends BudgetPageEntry>(
  category: string,
  entries: readonly E[],
): { entry: E; figure: BudgetCategoryEntryFigure }[] {
  const rows = entries.filter((e) => e.category === category && !e.isIncome);
  return rows.map((entry) => ({
    entry,
    figure: entry.notSet
      ? { kind: "notSet" }
      : rows.length > 1
        ? { kind: "amount", monthly: budgetEntryShownMonthly(entry) }
        : { kind: "nameOnly" },
  }));
}

/** A linked line as the page lists it, shaped like a saved row. */
export interface LinkedBudgetPageRow {
  id: string;
  userId: "";
  category: string;
  name: string;
  amount: number;
  frequency: "monthly";
  isIncome: boolean;
  isPrimaryIncome: false;
  isEssential: boolean;
  notes: null;
  isDefault: false;
  ownership: "sole" | "joint";
  sharePercent: number | null;
  linked: BudgetRowLink;
  linkedRowId?: string;
  linkAccountId?: string;
  notSet?: true;
  createdAt: "";
  updatedAt: "";
}

/**
 * The budget as the page lists it: the engine's `budgetRows` (saved rows with the linked lines in
 * place), each saved row as it was loaded. So a row on screen and the figures it adds to agree.
 */
export function pageBudgetRows<T extends { id: string }>(
  saved: readonly T[],
  budgetRows: readonly BudgetEntryItem[],
): (T | LinkedBudgetPageRow)[] {
  const byId = new Map(saved.map((e) => [e.id, e]));
  const rows: (T | LinkedBudgetPageRow)[] = [];
  for (const row of budgetRows) {
    if (row.linked) {
      rows.push({
        id: row.id,
        userId: "",
        category: row.category,
        name: row.name,
        amount: row.amount,
        frequency: "monthly",
        isIncome: row.isIncome,
        isPrimaryIncome: false,
        isEssential: row.isEssential,
        notes: null,
        isDefault: false,
        // The share the figures count it at, so the row and the totals agree.
        ownership: row.ownership === "joint" ? "joint" : "sole",
        sharePercent: row.sharePercent ?? null,
        linked: row.linked,
        ...(row.linkedRowId ? { linkedRowId: row.linkedRowId } : {}),
        ...(row.linkAccountId ? { linkAccountId: row.linkAccountId } : {}),
        ...(row.notSet ? { notSet: true as const } : {}),
        createdAt: "",
        updatedAt: "",
      });
      continue;
    }
    const kept = byId.get(row.id);
    if (kept) rows.push(kept);
  }
  return rows;
}

/** An account as the page needs it to name a linked line: its id, name and stored type. */
export interface BudgetLinkableAccount {
  id: string;
  name: string;
  type: string;
}

/**
 * The account a savings or debt line reads, when it still exists and still fits the line. Null
 * for any other line, or when the account was deleted or changed type.
 */
export function linkedAccountFor<A extends { id: string; type: string }>(
  entry: { linked?: BudgetRowLink; linkAccountId?: string | null },
  accounts: readonly A[],
): A | null {
  if (!isBudgetAccountLink(entry.linked) || !entry.linkAccountId) return null;
  const account = accounts.find((a) => a.id === entry.linkAccountId);
  return account && accountFitsBudgetLink(entry.linked, account.type) ? account : null;
}

/** Where a linked line's figure comes from, or why it has none. */
export type LinkedBudgetSource =
  | { kind: "housingNotSet" }
  | { kind: "accountGone" }
  | { kind: "accountNotSet"; link: BudgetAccountLink; accountName: string }
  | { kind: "fromAccount"; link: BudgetAccountLink; accountName: string };

/** The source of a linked line, as a kind and an account name; null when there is nothing to say. */
export function linkedBudgetSource(
  entry: { linked?: BudgetRowLink; linkAccountId?: string | null; notSet?: boolean },
  accounts: readonly BudgetLinkableAccount[],
): LinkedBudgetSource | null {
  if (!isBudgetAccountLink(entry.linked)) {
    return entry.notSet ? { kind: "housingNotSet" } : null;
  }
  const account = linkedAccountFor(entry, accounts);
  if (!account) return { kind: "accountGone" };
  return {
    kind: entry.notSet ? "accountNotSet" : "fromAccount",
    link: entry.linked,
    accountName: account.name,
  };
}

/** The not-set or refused prompt the overview's headline shows in place of a figure. */
export type BudgetOverviewPrompt =
  | { kind: "refused"; notice: string }
  | { kind: "takeHomeNotSet" }
  | { kind: "housingNotSet" };

/** The line under the headline: safe to spend, or what to add to see it. */
export type BudgetOverviewSubline = "safeToSpend" | "addSalary" | "addEssentials";

export interface BudgetOverviewFacts {
  hasIncome: boolean;
  /** Money in each month, or null without an income row. */
  income: number | null;
  /** Left over each month (negative when short); 0 when unknown. */
  surplus: number;
  /** The headline figure: left over, or how short, as a positive amount; null without income. */
  heroFigure: number | null;
  isShort: boolean;
  /** Bills, spending and savings each month, or null when the budget is unknown. */
  goingOut: number | null;
  safeToSpendMonthly: number | null;
  /** True when safe to spend is unknown for want of a salary fact, not a budget one. */
  salaryMissing: boolean;
  /** What the left over leaves out, as one line, or null. */
  leavesOut: string | null;
  prompt: BudgetOverviewPrompt | null;
  /** Null while a prompt stands in for the figure. */
  subline: BudgetOverviewSubline | null;
  /** Both supporting figures are unknown and no prompt is shown: one prompt stands in for them. */
  supportingUnknown: boolean;
  /** Whether the "money in minus going out" line shows. */
  showsEquation: boolean;
}

/** The overview's facts from the budget's figures. */
export function selectBudgetOverview(picture: {
  budget: Figure<BudgetTotals>;
  safeToSpend: Figure<SafeToSpend>;
  budgetRows?: readonly Pick<BudgetEntryItem, "linked" | "notSet">[];
  takeHome?: Figure<TakeHome>;
}): BudgetOverviewFacts {
  const budget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  const leavesOut =
    isFigureKnown(picture.budget) && picture.budget.assumptions?.length
      ? picture.budget.assumptions.join(" ")
      : null;
  const goingOut = budget ? budget.essentials + budget.discretionary + budget.savings : null;
  const safeToSpend = isFigureKnown(picture.safeToSpend) ? picture.safeToSpend.value : null;
  const salaryMissing =
    !isFigureKnown(picture.safeToSpend) &&
    picture.safeToSpend.missing.some((key) => !key.startsWith("budget"));
  // Without an income row, income and what is left over are unknown.
  const hasIncome = budget?.hasIncome === true;
  const surplus = budget?.surplus ?? 0;
  const isShort = hasIncome && surplus < 0;
  // A linked line whose saved fact is not set leaves the totals unknown (never £0).
  const notSetLinks = new Set(
    (picture.budgetRows ?? []).filter((row) => row.notSet).map((row) => row.linked),
  );
  // Take-home refused because the year's rates are not published: the engine's one line.
  const takeHomeRefusal =
    picture.takeHome &&
    !isFigureKnown(picture.takeHome) &&
    picture.takeHome.reason === "rates-not-published"
      ? (picture.takeHome.notice ?? null)
      : null;
  const prompt: BudgetOverviewPrompt | null =
    notSetLinks.has("take_home") && takeHomeRefusal
      ? { kind: "refused", notice: takeHomeRefusal }
      : notSetLinks.has("take_home")
        ? { kind: "takeHomeNotSet" }
        : notSetLinks.has("housing")
          ? { kind: "housingNotSet" }
          : null;
  const subline: BudgetOverviewSubline | null = prompt
    ? null
    : safeToSpend
      ? "safeToSpend"
      : salaryMissing
        ? "addSalary"
        : "addEssentials";
  return {
    hasIncome,
    income: hasIncome ? (budget?.income ?? 0) : null,
    surplus,
    heroFigure: hasIncome ? Math.abs(surplus) : null,
    isShort,
    goingOut,
    safeToSpendMonthly: safeToSpend ? safeToSpend.monthly : null,
    salaryMissing,
    leavesOut,
    prompt,
    subline,
    supportingUnknown: !hasIncome && goingOut === null && !prompt,
    showsEquation: hasIncome || goingOut !== null,
  };
}

/** Why a spending row always counts in breathing room, or null when its switch can change. */
export type BreathingRoomFixedReason = "housing" | "debt";

export function breathingRoomFixedReason(entry: {
  linked?: BudgetRowLink;
  category: string;
}): BreathingRoomFixedReason | null {
  if (entry.linked === "housing") return "housing";
  if (entry.category === DEBT_CATEGORY) return "debt";
  return null;
}

export interface BreathingRoomBasisFacts<A, E> {
  /** Current and savings accounts, each at its latest balance and never below £0. */
  drawOn: { account: A; balance: number }[];
  /** Spending rows above £0 a month, each with whether it counts and why it always does. */
  spending: {
    entry: E;
    monthly: number;
    fixedReason: BreathingRoomFixedReason | null;
    counted: boolean;
  }[];
  /** How many spending rows count. */
  counted: number;
}

/** "What Breathing room counts": the accounts it draws on and the spending it covers. */
export function selectBreathingRoomBasis<A extends RawAccount, E extends BudgetPageEntry>(
  entries: readonly E[],
  accounts: readonly A[],
  details: readonly RawAccountDetail[],
): BreathingRoomBasisFacts<A, E> {
  const snapshot = new PortfolioSnapshot([...accounts], [...details]);
  // The engine's own rule for money to draw on: current and savings accounts.
  const drawOn = accounts
    .filter((a) => {
      const category = a.id ? snapshot.getAccount(a.id)?.category : undefined;
      return category === "cash" || category === "savings";
    })
    .map((account) => ({
      account,
      balance: Math.max(0, snapshot.getLatestBalance(account.id ?? "")),
    }));
  const spending = entries
    .filter((e) => !isIncomeEntry(e) && budgetRowMonthly(e) > 0)
    .map((entry) => {
      const fixedReason = breathingRoomFixedReason(entry);
      return {
        entry,
        monthly: budgetRowMonthly(entry),
        fixedReason,
        counted: entry.isEssential || fixedReason !== null,
      };
    });
  return { drawOn, spending, counted: spending.filter((s) => s.counted).length };
}

/** The illustration's inputs. None is saved. */
export interface RunwayScenarioInputs {
  includedAccounts?: Readonly<Record<string, boolean>>;
  keptIncome?: Readonly<Record<string, boolean>>;
  severanceLump?: number;
  extraMonthlyCut?: number;
}

/** The highest lump sum the illustration takes. */
export const RUNWAY_LUMP_MAX = 100000;

/** A lump sum held between £0 and £100,000. */
export function clampRunwayLump(value: number): number {
  return Math.max(0, Math.min(RUNWAY_LUMP_MAX, value));
}

/** A monthly cut held at £0 or more. */
export function clampRunwayCut(value: number): number {
  return Math.max(0, value);
}

/** What the illustration starts from: the saved figure, its accounts, income and spending rows. */
export interface RunwaySetup<A, E> {
  /** The saved figure, or null when it is unknown. */
  saved: MonthsOfCover | null;
  /** Debt minimums the saved figure counts that are not budget rows. */
  debtNotInBudget: number;
  /** Current, savings and investment accounts, each with its latest balance. */
  poolAccounts: { account: A; balance: number }[];
  /** Income rows the person typed (no linked line): kept only when switched on. */
  otherIncome: { entry: E; monthly: number }[];
  /** Spending and savings rows. */
  expenses: { entry: E; monthly: number }[];
  /** Current and savings on, investments off. */
  defaultAccounts: Record<string, boolean>;
  /** Every other income row off: income stopping is the question. */
  defaultIncome: Record<string, boolean>;
  /** The rows the saved figure counts: essential ones and debt payments. */
  defaultExpenses: Record<string, boolean>;
}

/** The illustration's setup from the saved figure and the page's rows. */
export function runwaySetup<A extends RawAccount & { id: string }, E extends BudgetPageEntry>(
  baseline: Figure<MonthsOfCover>,
  entries: readonly E[],
  accounts: readonly A[],
  details: readonly RawAccountDetail[],
): RunwaySetup<A, E> {
  const saved = isFigureKnown(baseline) ? baseline.value : null;
  const snapshot = new PortfolioSnapshot([...accounts], [...details]);
  const categoryOf = (id: string) => snapshot.getAccount(id)?.category;
  const poolAccounts = accounts
    .filter((a) => {
      const category = categoryOf(a.id);
      return category === "cash" || category === "savings" || category === "investments";
    })
    .map((account) => ({ account, balance: snapshot.getLatestBalance(account.id) }));
  // Take-home pay is the income that stops, so every linked line is left out.
  const otherIncome = entries
    .filter((e) => e.isIncome && !e.linked)
    .map((entry) => ({ entry, monthly: budgetRowMonthly(entry) }));
  const expenses = entries
    .filter((e) => !e.isIncome)
    .map((entry) => ({ entry, monthly: budgetRowMonthly(entry) }));
  return {
    saved,
    debtNotInBudget: saved
      ? Math.max(0, saved.commitments.debtCommitment - saved.commitments.budgetDebtPayments)
      : 0,
    poolAccounts,
    otherIncome,
    expenses,
    defaultAccounts: Object.fromEntries(
      poolAccounts.map(({ account }) => {
        const category = categoryOf(account.id);
        return [account.id, category === "cash" || category === "savings"];
      }),
    ),
    defaultIncome: Object.fromEntries(otherIncome.map(({ entry }) => [entry.id, false])),
    // Debt-payment rows always count in the saved figure, whatever their essential flag.
    defaultExpenses: Object.fromEntries(
      expenses.map(({ entry }) => [
        entry.id,
        entry.isEssential || entry.category === DEBT_CATEGORY,
      ]),
    ),
  };
}

export interface RunwayIllustration {
  /** The accounts switched on, each at no less than £0. */
  totalPool: number;
  /** The other income kept, a month. */
  totalKeptIncome: number;
  /** The spending counted, a month. */
  totalSelectedExpenses: number;
  /** Money to draw on in the illustration. */
  pool: number;
  /** What is paid out each month in the illustration, never below £0. */
  monthlyBurn: number;
  /** Breathing room in months, or null when nothing is paid each month. */
  months: number | null;
  /** True when any input differs from where the illustration starts. */
  isModified: boolean;
}

function sameFlags(
  current: Readonly<Record<string, boolean>>,
  defaults: Readonly<Record<string, boolean>>,
): boolean {
  return Object.keys(defaults).every((id) => (current[id] ?? defaults[id]) === defaults[id]);
}

/**
 * The illustration from its setup and inputs. It starts from the saved figure's own two numbers
 * and applies only what the person changed, so an untouched zone shows exactly the saved figure.
 * Missing flags take their default; the lump sum and cut are clamped.
 */
export function runwayIllustration<A extends { id: string }, E extends { id: string }>(
  setup: RunwaySetup<A, E>,
  inputs: RunwayScenarioInputs = {},
): RunwayIllustration {
  const included = { ...setup.defaultAccounts, ...(inputs.includedAccounts ?? {}) };
  const kept = { ...setup.defaultIncome, ...(inputs.keptIncome ?? {}) };
  const severanceLump = clampRunwayLump(inputs.severanceLump ?? 0);
  const extraMonthlyCut = clampRunwayCut(inputs.extraMonthlyCut ?? 0);
  const poolOf = (flags: Readonly<Record<string, boolean>>) =>
    setup.poolAccounts
      .filter(({ account }) => flags[account.id])
      // An overdrawn account is debt, not negative cash (as in the saved figure).
      .reduce((s, { balance }) => s + Math.max(0, balance), 0);
  const totalPool = poolOf(included);
  const totalKeptIncome = setup.otherIncome
    .filter(({ entry }) => kept[entry.id])
    .reduce((s, { monthly }) => s + monthly, 0);
  // Which spending counts is each entry's saved Essential flag, so it is always the default.
  const totalSelectedExpenses = setup.expenses
    .filter(({ entry }) => setup.defaultExpenses[entry.id])
    .reduce((s, { monthly }) => s + monthly, 0);
  const defaultPool = poolOf(setup.defaultAccounts);
  const defaultSelectedExpenses = totalSelectedExpenses;
  const { saved } = setup;
  const pool = saved
    ? Math.max(0, saved.liquidCash + (totalPool - defaultPool) + severanceLump)
    : totalPool + severanceLump;
  const monthlyBurn = Math.max(
    0,
    saved
      ? saved.monthlyEssentials +
          (totalSelectedExpenses - defaultSelectedExpenses) -
          totalKeptIncome -
          extraMonthlyCut
      : totalSelectedExpenses + setup.debtNotInBudget - totalKeptIncome - extraMonthlyCut,
  );
  return {
    totalPool,
    totalKeptIncome,
    totalSelectedExpenses,
    pool,
    monthlyBurn,
    months: monthsOfCoverFor(pool, monthlyBurn),
    isModified:
      severanceLump !== 0 ||
      extraMonthlyCut !== 0 ||
      !sameFlags(included, setup.defaultAccounts) ||
      !sameFlags(kept, setup.defaultIncome),
  };
}

/** The illustration in one call: its setup from the rows, then the outcome for the inputs. */
export function selectRunwayIllustration<
  A extends RawAccount & { id: string },
  E extends BudgetPageEntry,
>(input: {
  baseline: Figure<MonthsOfCover>;
  entries: readonly E[];
  accounts: readonly A[];
  details: readonly RawAccountDetail[];
  scenario?: RunwayScenarioInputs | null;
}): RunwaySetup<A, E> & RunwayIllustration {
  const setup = runwaySetup(input.baseline, input.entries, input.accounts, input.details);
  return { ...setup, ...runwayIllustration(setup, input.scenario ?? {}) };
}

/** The figures the page is built from, as `buildFinancialPicture` names them. */
export interface BudgetPageFigures {
  takeHome: Figure<TakeHome>;
  budgetRows: BudgetEntryItem[];
  budget: Figure<BudgetTotals>;
  safeToSpend: Figure<SafeToSpend>;
  monthsOfCover: Figure<MonthsOfCover>;
}

/** The Budget page from its figures and saved rows: the one assembly web and mobile share. */
export interface BudgetPage<A, E> extends BudgetPageFigures {
  overview: BudgetOverviewFacts;
  /** The rows the page lists: saved rows with the linked lines in place. */
  rows: (E | LinkedBudgetPageRow)[];
  /** "Where your money goes", ranked, each with its entries and their source lines. */
  categories: (BudgetCategoryRank & {
    entries: {
      entry: E | LinkedBudgetPageRow;
      figure: BudgetCategoryEntryFigure;
      source: LinkedBudgetSource | null;
    }[];
  })[];
  basis: BreathingRoomBasisFacts<A, E | LinkedBudgetPageRow>;
  /** The illustration's starting point, with no inputs changed. */
  runway: RunwaySetup<A & { id: string }, E | LinkedBudgetPageRow> & RunwayIllustration;
}

/** The page from figures the caller already has (web's picture, or the rows' own figures). */
export function selectBudgetPage<
  A extends RawAccount & { id: string; name: string; type: string },
  E extends BudgetPageEntry,
>(input: {
  figures: BudgetPageFigures;
  saved: readonly E[];
  accounts: readonly A[];
  details: readonly RawAccountDetail[];
  customCategories?: readonly string[] | null;
}): BudgetPage<A, E> {
  const { figures, accounts, details } = input;
  const rows = pageBudgetRows(input.saved, figures.budgetRows);
  const categories = rankBudgetCategories(
    budgetPageCategories(input.customCategories ?? [], input.saved),
    rows,
  ).map((total) => ({
    ...total,
    entries: budgetCategoryEntries(total.category, rows).map((item) => ({
      ...item,
      source: linkedBudgetSource(item.entry, accounts),
    })),
  }));
  return {
    takeHome: figures.takeHome,
    budgetRows: figures.budgetRows,
    budget: figures.budget,
    safeToSpend: figures.safeToSpend,
    monthsOfCover: figures.monthsOfCover,
    overview: selectBudgetOverview(figures),
    rows,
    categories,
    basis: selectBreathingRoomBasis(rows, accounts, details),
    runway: selectRunwayIllustration({
      baseline: figures.monthsOfCover,
      entries: rows,
      accounts,
      details,
    }),
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
export interface BudgetPageRows {
  accounts?: readonly RawAccount[] | null;
  details?: readonly RawAccountDetail[] | null;
  budgetEntries?: readonly (BudgetRowLike | null | undefined)[] | null;
  profile?: (Partial<UserProfileData> & { customBudgetCategories?: unknown }) | null;
  /** The date the take-home's tax year is read from. */
  today: Date;
}

/** A saved row the page lists, mapped from the API's row. */
export type BudgetPageSavedRow = BudgetEntryItem;

/** An account as the page names it, mapped from the API's row. */
export type BudgetPageAccount = RawAccount & { id: string; name: string; type: string };

/**
 * The Budget page straight from the saved rows, for the mobile app: the same figures
 * `buildFinancialPicture` works out (`selectBudgetFigures`, `selectSafeToSpend`,
 * `selectMonthsOfCover`), then `selectBudgetPage`. The caller does no sums. `ratesContext` is
 * today's rates (for the rates sentence); `takeHomeRates` is the same only when the budget counts
 * a worked-out take-home line.
 */
export function selectBudgetPageFromRows(rows: BudgetPageRows): BudgetPage<
  BudgetPageAccount,
  BudgetPageSavedRow
> & {
  ratesContext: UkTaxYearContext | null;
  takeHomeRates: UkTaxYearContext | null;
} {
  const accounts = Array.isArray(rows.accounts) ? [...rows.accounts] : [];
  const details = Array.isArray(rows.details) ? [...rows.details] : [];
  const savedRows = Array.isArray(rows.budgetEntries) ? rows.budgetEntries : [];
  const budget = savedRows.flatMap((row, index) =>
    row == null ? [] : [budgetEntryFromRow(row, index)],
  );
  const snapshot = new PortfolioSnapshot(accounts, details);
  const rates = ratesContextOn(rows.today);
  // Before the earliest supported year the calendar year is passed as it is, so the take-home
  // reads "unsupported year", as the picture does on that date.
  const taxYear = (rates?.ratesYear ??
    getUkTaxYearForDate(getUkCalendarDate(rows.today))) as UkTaxYear;
  const figures = selectBudgetFigures(
    { profile: profileFactsFromProfile(rows.profile), accounts, budget },
    snapshot,
    { taxYear },
  );
  const budgetRows = figures.linked.rows;
  const custom = rows.profile?.customBudgetCategories;
  const page = selectBudgetPage({
    figures: {
      takeHome: figures.takeHome,
      budgetRows,
      budget: figures.budget,
      safeToSpend: selectSafeToSpend(figures.takeHome, budgetRows, snapshot),
      monthsOfCover: selectMonthsOfCover(budgetRows, snapshot),
    },
    saved: budget,
    accounts: accounts.map((a) => ({
      ...a,
      id: String(a.id ?? ""),
      name: typeof a.name === "string" ? a.name : "",
      type: typeof a.type === "string" ? a.type : "",
    })),
    details,
    customCategories: Array.isArray(custom)
      ? custom.filter((c): c is string => typeof c === "string")
      : [],
  });
  return {
    ...page,
    ratesContext: rates,
    takeHomeRates: budgetCountsWorkedOutTakeHome(figures.takeHome, budgetRows) ? rates : null,
  };
}
