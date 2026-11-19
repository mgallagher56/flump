import { categorizeAccountType } from "../../account-category.js";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { BUDGET_HOUSING_CATEGORY } from "../../budget-entry-names.js";
import type { PortfolioSnapshot, ResolvedAccount } from "../../portfolio.js";
import type { Figure } from "../figure.js";
import { DEBT_CATEGORY, SAVINGS_CATEGORY } from "./budget-totals.js";
import type { HousingPayment } from "./housing-cost.js";
import type { TakeHome } from "./take-home.js";

/** Which saved detail a linked row reads. */
export type BudgetRowLink = "take_home" | "housing" | "savings" | "debt";

/** The link kinds that read one account (`budget_entries.link_account_id`), audit slice 5. */
export type BudgetAccountLink = "savings" | "debt";

/** The stored link kinds, in the order the CHECK on `budget_entries.link_kind` lists them. */
export const BUDGET_ROW_LINKS: readonly BudgetRowLink[] = [
  "take_home",
  "housing",
  "savings",
  "debt",
];

/** The stored link kinds that read an account. */
export const BUDGET_ACCOUNT_LINKS: readonly BudgetAccountLink[] = ["savings", "debt"];

/** A stored `linkKind`, or null for anything else. */
export function budgetRowLinkOf(value: unknown): BudgetRowLink | null {
  return (BUDGET_ROW_LINKS as readonly unknown[]).includes(value) ? (value as BudgetRowLink) : null;
}

/** True for a link kind that reads an account's monthly amount. */
export function isBudgetAccountLink(value: unknown): value is BudgetAccountLink {
  return value === "savings" || value === "debt";
}

/** The budget category a line linked to an account lives in: "savings" or "debt". */
export const BUDGET_ACCOUNT_LINK_CATEGORY: Record<BudgetAccountLink, string> = {
  savings: SAVINGS_CATEGORY,
  debt: DEBT_CATEGORY,
};

/**
 * Whether an account of this stored type can back a line of this kind: a savings line reads a
 * savings or investment account (the accounts the Savings page lists), a debt line a card, loan
 * or overdraft (the accounts the Debt page lists). Mortgages belong to the housing line and
 * student loans are paid through pay, so neither can back a debt line. The backend refuses a link
 * that does not fit, and the engine reads a line whose account no longer fits as "Not set".
 */
export function accountFitsBudgetLink(
  link: BudgetAccountLink,
  accountType: string | null | undefined,
): boolean {
  const category = categorizeAccountType(accountType);
  return link === "savings"
    ? category === "savings" || category === "investments"
    : category === "debt";
}

/**
 * The monthly amount a line linked to this account reads: the saved monthly saving (savings) or
 * monthly payment (debt), at the person's share of a joint account, or null when none is saved.
 * The snapshot has already applied the share once (`applyAccountShare`), so the line counts at
 * 100% and no second share is applied. A saved £0 is a real £0.
 */
export function budgetLinkAccountMonthly(account: ResolvedAccount): number | null {
  return account.monthlyContributionKnown ? account.monthlyContribution : null;
}

export const LINKED_TAKE_HOME_ID = "linked:take-home";
export const LINKED_HOUSING_ID = "linked:housing";

/** The name a linked housing row shows, by how the person pays for housing. */
export const HOUSING_ROW_NAME: Record<HousingPayment["kind"], string> = {
  rent: "Rent",
  mortgage: "Mortgage payment",
  household: "Household contribution",
};

/**
 * A saved fact that is not in the budget yet. The budget already has rows of that kind (income
 * rows, or housing rows), so nothing is added or replaced on its own: the page says the saved
 * figure is not in this budget and offers two actions, to add it as its own linked line or to
 * replace one of the listed rows with it. Until the person chooses, it is counted nowhere.
 */
export interface BudgetLinkOffer {
  link: BudgetRowLink;
  /** The saved figure the line would read, pounds a month. */
  monthly: number;
  /** For housing: rent, mortgage payment or household contribution. Null for take-home. */
  kind: HousingPayment["kind"] | null;
  /** True when the figure is the mortgage accounts' estimate ("about £X"). */
  paymentEstimated: boolean;
  /** The saved rows the person can pick one of to replace, in budget order. */
  rowIds: string[];
}

export interface LinkedBudgetRows {
  /** The budget the figures count: saved rows, less the ones a linked row stands in for, plus it. */
  rows: BudgetEntryItem[];
  /** Saved rows a linked row stands in for. Kept in storage, left out of every figure. */
  shadowedRowIds: string[];
  /** Saved facts not in the budget yet, each with the rows it could replace. */
  offers: BudgetLinkOffer[];
}

/**
 * A linked line whose saved fact is not set (salary cleared, no rent saved). Its amount is not a
 * figure: it shows "Not set" with an action, and every total that would count it is unknown.
 */
function notSetLine(base: BudgetEntryItem, chosen: BudgetEntryItem): BudgetEntryItem {
  return { ...base, amount: 0, linkedRowId: chosen.id, notSet: true };
}

const isIncomeRow = (row: BudgetEntryItem): boolean => row.isIncome === true;

/** A spending row in the housing category. Names are never read. */
const isHousingRow = (row: BudgetEntryItem): boolean =>
  row.isIncome !== true && row.category === BUDGET_HOUSING_CATEGORY;

/**
 * The budget with its linked rows (owner items 7 and 33b). One stored value each, read here. No
 * row name is read for any of these money decisions: a name decides nothing.
 *
 * A saved fact (take-home pay worked out from the profile's salary; the saved rent, mortgage
 * payment or household contribution, or the mortgage accounts' estimate) is in the budget only
 * through a line linked to it (`linkKind`). Other rows never stand in for it:
 * - A row the person linked reads the fact in that row's place, and reads "Not set" (`notSet`)
 *   when the fact is not saved: its stored amount is never read.
 * - No row is linked and the budget has no rows of that kind at all (no income rows, or no
 *   housing rows): the linked line is added.
 * - No row is linked and the budget has rows of that kind (even a £0 one): nothing is added or
 *   replaced, and an offer says the saved figure is not in this budget. It is counted nowhere
 *   until the person adds it as its own line or picks a row for it to replace.
 * - A second row linked to the same fact reads "Not set" (the database allows one per kind).
 *
 * A linked line is always the person's own figure at 100% (sole): take-home pay is the person's
 * own, and the housing figure is exactly what `selectHousingCost` counts, already the person's own
 * (a mortgage's saved payment or estimate at the account's share; a whole rent taken at the stored
 * rent line's share, once, in `housingPayment`), so no second share is applied here.
 * A saved £0 (a household contribution of nothing) is a real £0, not "Not set". Nothing is
 * written: the rows exist only in the figures and on screen.
 *
 * Savings and debt lines (audit slice 5) are linked to one account each (`linkAccountId`) and
 * only ever by the person: the engine never adds one or offers to replace a row on its own
 * (`findBudgetAccountLinkOffers` offers a one-tap link for a row that matches an account). A
 * linked line reads the account's monthly amount at the person's share (`budgetLinkAccountMonthly`)
 * and counts it at 100%, so a joint account's share is applied exactly once. It keeps the row's
 * own name, category and essential flag. It reads "Not set" when the account has no saved monthly
 * amount, was deleted (the foreign key clears `linkAccountId`), or is no longer a savings or debt
 * account (its type changed): never the stored £0. Pass `accounts` whenever the budget may hold
 * such lines; without it they all read "Not set".
 */
export function withLinkedBudgetRows(
  budget: readonly BudgetEntryItem[],
  sources: {
    takeHome: Figure<Pick<TakeHome, "monthly">>;
    housing: HousingPayment | null;
    accounts?: Pick<PortfolioSnapshot, "getResolvedAccounts"> | null;
  },
): LinkedBudgetRows {
  // No budget yet stays no budget (unknown, never £0): linked rows join a budget once it is started.
  if (budget.length === 0) return { rows: [...budget], shadowedRowIds: [], offers: [] };

  const offers: BudgetLinkOffer[] = [];
  const replaced = new Map<string, BudgetEntryItem>();
  let addTakeHome: BudgetEntryItem | null = null;
  let addHousing: BudgetEntryItem | null = null;

  // Take-home pay. A salary of £0 is not set, so known take-home is above £0.
  const takeHome =
    sources.takeHome.status === "known" && sources.takeHome.value.monthly > 0
      ? sources.takeHome.value.monthly
      : null;
  const takeHomeBase: BudgetEntryItem = {
    id: LINKED_TAKE_HOME_ID,
    category: "income",
    name: "Take-home pay",
    amount: takeHome ?? 0,
    frequency: "monthly",
    isIncome: true,
    isEssential: true,
    ownership: "sole",
    sharePercent: null,
    linked: "take_home",
  };
  const incomeRows = budget.filter(isIncomeRow);
  const chosenTakeHome = incomeRows.find((row) => row.linkKind === "take_home");
  if (chosenTakeHome) {
    // The person linked this row: its stored amount is never read, resolved or not.
    replaced.set(
      chosenTakeHome.id,
      takeHome !== null
        ? { ...takeHomeBase, linkedRowId: chosenTakeHome.id }
        : notSetLine(takeHomeBase, chosenTakeHome),
    );
  } else if (takeHome !== null) {
    if (incomeRows.length === 0) {
      addTakeHome = takeHomeBase;
    } else {
      offers.push({
        link: "take_home",
        monthly: takeHome,
        kind: null,
        paymentEstimated: false,
        rowIds: incomeRows.map((row) => row.id),
      });
    }
  }

  // Housing. A saved £0 (household contribution) is a real figure: only null is not set.
  const housing = sources.housing;
  const housingRows = budget.filter(isHousingRow);
  const chosenHousing = housingRows.find((row) => row.linkKind === "housing");
  const housingBase: BudgetEntryItem = {
    id: LINKED_HOUSING_ID,
    category: BUDGET_HOUSING_CATEGORY,
    name: housing ? HOUSING_ROW_NAME[housing.kind] : (chosenHousing?.name ?? "Housing"),
    amount: housing?.monthly ?? 0,
    frequency: "monthly",
    isIncome: false,
    isEssential: true,
    ownership: "sole",
    sharePercent: null,
    linked: "housing",
  };
  if (chosenHousing) {
    replaced.set(
      chosenHousing.id,
      housing
        ? { ...housingBase, linkedRowId: chosenHousing.id }
        : notSetLine(housingBase, chosenHousing),
    );
  } else if (housing) {
    if (housingRows.length === 0) {
      addHousing = housingBase;
    } else if (housing.monthly > 0) {
      // A saved £0 left out changes no figure, so it is not offered.
      offers.push({
        link: "housing",
        monthly: housing.monthly,
        kind: housing.kind,
        paymentEstimated: housing.paymentEstimated,
        rowIds: housingRows.map((row) => row.id),
      });
    }
  }

  // Savings and debt lines, each reading its own account. One line per account (the database
  // holds one; a second line on the same account reads Not set, as a second take-home line does).
  const accountsById = new Map(
    (sources.accounts?.getResolvedAccounts() ?? []).map((account) => [account.id, account]),
  );
  const readAccountIds = new Set<string>();
  for (const row of budget) {
    const kind = row.linkKind;
    if (!isBudgetAccountLink(kind)) continue;
    const accountId = row.linkAccountId ?? null;
    const firstOnAccount = accountId !== null && !readAccountIds.has(accountId);
    if (accountId !== null) readAccountIds.add(accountId);
    const account = firstOnAccount ? accountsById.get(accountId) : undefined;
    const monthly =
      account && row.isIncome !== true && accountFitsBudgetLink(kind, account.rawType)
        ? budgetLinkAccountMonthly(account)
        : null;
    const base: BudgetEntryItem = {
      id: `linked:${kind}:${row.id}`,
      category: row.category,
      name: row.name,
      amount: monthly ?? 0,
      frequency: "monthly",
      isIncome: false,
      isEssential: row.isEssential,
      ownership: "sole",
      sharePercent: null,
      linked: kind,
      linkAccountId: accountId,
    };
    replaced.set(
      row.id,
      monthly !== null ? { ...base, linkedRowId: row.id } : notSetLine(base, row),
    );
  }

  // Only one row per kind can read a saved fact (the database holds one; this guards older data).
  // Any further row linked to the same fact is Not set, never its stored £0.
  for (const extra of budget) {
    const kind = extra.linkKind;
    if (!kind || isBudgetAccountLink(kind) || replaced.has(extra.id)) continue;
    const chosen = kind === "take_home" ? chosenTakeHome : chosenHousing;
    if (chosen?.id === extra.id) continue;
    replaced.set(
      extra.id,
      notSetLine(
        {
          id: `${kind === "take_home" ? LINKED_TAKE_HOME_ID : LINKED_HOUSING_ID}:${extra.id}`,
          category: extra.category,
          name: extra.name,
          amount: 0,
          frequency: "monthly",
          isIncome: extra.isIncome,
          isEssential: extra.isEssential,
          ownership: "sole",
          sharePercent: null,
          linked: kind,
        },
        extra,
      ),
    );
  }

  if (replaced.size === 0 && !addTakeHome && !addHousing) {
    return { rows: [...budget], shadowedRowIds: [], offers };
  }
  const rows: BudgetEntryItem[] = addTakeHome ? [addTakeHome] : [];
  for (const row of budget) rows.push(replaced.get(row.id) ?? row);
  if (addHousing) rows.push(addHousing);
  return { rows, shadowedRowIds: [...replaced.keys()], offers };
}

/**
 * The budget as every reader lists it (the web page, the AI context pack, the MCP tools): the
 * resolved rows (`withLinkedBudgetRows`' rows, so shadowed rows are already gone and lines the
 * engine adds are in), each shown through the caller's copy of its saved entry. A line standing in
 * for a saved row keeps that entry's id, name, category and notes (so a caller's anonymised copy
 * stays anonymised) and takes the line's figure, frequency, share and `notSet`. A saved row is the
 * caller's entry as it is. A line the engine added has a fixed name ("Take-home pay", "Rent").
 */
export function listedBudgetEntries(
  entries: readonly BudgetEntryItem[],
  resolvedRows: readonly BudgetEntryItem[],
): BudgetEntryItem[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const listed: BudgetEntryItem[] = [];
  for (const row of resolvedRows) {
    const savedId = row.linked ? row.linkedRowId : row.id;
    const saved = savedId ? byId.get(savedId) : undefined;
    if (!row.linked) {
      if (saved) listed.push(saved);
      continue;
    }
    if (!saved) {
      listed.push(row);
      continue;
    }
    listed.push({
      ...saved,
      amount: row.notSet ? 0 : row.amount,
      frequency: row.frequency,
      ownership: row.ownership,
      sharePercent: row.sharePercent,
      linked: row.linked,
      linkedRowId: saved.id,
      ...(row.notSet ? { notSet: true as const } : {}),
    });
  }
  return listed;
}
