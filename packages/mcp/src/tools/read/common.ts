import {
  type AccountCategory,
  anonymiseDescription,
  type BudgetEntryItem,
  type BudgetLinkOffer,
  createBudgetCategoryAnonymiser,
  DEFAULT_NET_WORTH_BASIS,
  type FinancialPicture,
  genericAccountLabel,
  listedBudgetEntries,
  type NetWorthBasis,
  type NetWorthLeftOut,
  PortfolioSnapshot,
  type ResolvedAccount,
  resolveSnapshotNetWorthScope,
} from "@flump/finance-engine";
import { effectiveAnonymize } from "../../auth/scopes.js";
import type { ToolOutput } from "../../envelope.js";
import { resolveShortId, shortId, shortIdKey } from "../../short-ids.js";
import type { McpFinancialData, McpServerContext } from "../../types.js";

export type Missing = NonNullable<ToolOutput<unknown>["missing"]>[number];

const CATEGORY_NAMES: Record<AccountCategory, string> = {
  cash: "Current",
  savings: "Saving",
  investments: "Investment",
  pensions: "Pension",
  debt: "Debt",
  mortgages: "Mortgage",
  property: "Property",
  studentLoans: "Student Loan",
  other: "Other",
};

const MAX_TEXT = 60;

function isUnsafe(code: number): boolean {
  return (
    code <= 0x1f ||
    (code >= 0x7f && code <= 0x9f) ||
    code === 0x2028 ||
    code === 0x2029 ||
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0xfeff
  );
}

/**
 * Prompt-injection hardening for any user-controlled string echoed to the model (account, budget
 * and category names): removes control characters and newlines, collapses whitespace and caps the
 * length. It does not make text trustworthy, so such text only ever appears as a data value, never
 * inside `askUser`, `why` or `notice`.
 */
export function sanitiseText(text: string, max: number = MAX_TEXT): string {
  const clean = Array.from(text, (ch) => (isUnsafe(ch.charCodeAt(0)) ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface AccountIndex {
  accounts: ResolvedAccount[];
  anonymise: boolean;
  /** Short id for a record, per kind, keyed on the token. */
  idOf(kind: "acc" | "debt", uuid: string): string;
  /** Label shown to the agent: a generic per-category label when anonymised, else the sanitised name. */
  labelOf(account: ResolvedAccount): string;
  /**
   * Fixed-vocabulary reference ("Debt account #2") safe to put in `missing[]` text: it never
   * contains user-controlled text, in either the anonymised or the full-read path.
   */
  refOf(account: ResolvedAccount): string;
  /** The user's account a short `acc_` id names, or undefined (never another user's account). */
  resolve(shortAccountId: string): ResolvedAccount | undefined;
}

export interface ReadModel extends AccountIndex {
  raw: McpFinancialData;
  /**
   * The financial picture the provider built from the same rows (the engine's one assembler).
   * Every shared figure (net worth, budget totals, Breathing room, debt) is read from here.
   */
  picture: FinancialPicture;
  snapshot: PortfolioSnapshot;
  /** What net worth counts for this user; every net worth figure uses it. */
  basis: NetWorthBasis;
  /** What net worth leaves out under the basis, in display order. */
  netWorthLeavesOut: NetWorthLeftOut[];
  /**
   * The budget as the engine resolves it for the web page and the context pack
   * (`listedBudgetEntries`): linked rows at the take-home pay or housing payment a month, or a
   * `notSet` line, lines the engine adds or fills on its own included, shadowed rows left out.
   * Budget tools read these, never `raw.budgetEntries`, so their totals match the web.
   */
  budgetEntries: BudgetEntryItem[];
  /**
   * Saved facts (take-home pay, the housing payment) not in the budget: the budget has rows of that
   * kind of its own and the user has not added the fact or picked a row to replace. Counted nowhere.
   */
  budgetLinkOffers: BudgetLinkOffer[];
}

/** The engine's closed account category for a stored account type (never the free-text type). */
export const ACCOUNT_CATEGORIES = [
  "cash",
  "savings",
  "investments",
  "pensions",
  "debt",
  "mortgages",
  "property",
  "studentLoans",
  "other",
] as const satisfies readonly AccountCategory[];

/**
 * Labels and short ids over the user's accounts in stored order. Every read tool goes through this,
 * so a label ("Saving #2") and an id mean the same account in every tool.
 */
export function indexAccounts(ctx: McpServerContext, accounts: ResolvedAccount[]): AccountIndex {
  const anonymise = effectiveAnonymize(ctx.token.anonymizeInstitutions, ctx.token.scopes);
  const key = shortIdKey(ctx.token);
  // Per-category ordinals over all accounts in stored order, so a label is stable across tools.
  // The category comes from the engine's closed enum, not from the free-text stored `type`
  // (the backend `account.type` column is an unvalidated varchar), so nothing user-typed leaks.
  const ordinals = new Map<string, number>();
  const labels = new Map<string, string>();
  const refs = new Map<string, string>();
  for (const a of accounts) {
    const n = (ordinals.get(a.category) ?? 0) + 1;
    ordinals.set(a.category, n);
    const generic = genericAccountLabel(CATEGORY_NAMES[a.category], n);
    refs.set(a.id, `${CATEGORY_NAMES[a.category]} account #${n}`);
    labels.set(a.id, anonymise ? generic : sanitiseText(a.name) || generic);
  }
  return {
    accounts,
    anonymise,
    idOf: (kind, uuid) => shortId(key, kind, uuid),
    labelOf: (a) => labels.get(a.id) ?? "Account",
    refOf: (a) => refs.get(a.id) ?? "Account",
    resolve: (id) => resolveShortId(key, "acc", accounts, id),
  };
}

/** Accounts only (no history, budget or tax rows), for the ranged read tools. */
export async function loadAccountIndex(ctx: McpServerContext): Promise<AccountIndex> {
  const raw = await ctx.dataProvider.getAccounts(ctx.token.userId);
  return indexAccounts(ctx, new PortfolioSnapshot(raw, []).getResolvedAccounts());
}

/** Reads the user's data once and builds the shared view every summary read tool works from. */
export async function loadReadModel(ctx: McpServerContext): Promise<ReadModel> {
  const anonymise = effectiveAnonymize(ctx.token.anonymizeInstitutions, ctx.token.scopes);
  const raw = await ctx.dataProvider.getUserFinancialData(ctx.token.userId, {
    anonymizeInstitutions: anonymise,
  });
  const snapshot = new PortfolioSnapshot(raw.accounts ?? [], raw.accountDetails ?? []);
  // The provider boundary: a provider built before the choices existed sends no basis.
  const basis = raw.netWorthBasis ?? { ...DEFAULT_NET_WORTH_BASIS };
  // The budget as the picture resolved it (linked take-home and housing lines in place, shadowed
  // rows left out), listed as the web page lists it. Not resolved a second time here.
  const picture = raw.picture;
  return {
    raw,
    // Taken from the provider as it is: a read tool never rebuilds the picture.
    picture,
    snapshot,
    basis,
    budgetEntries: listedBudgetEntries(raw.budgetEntries ?? [], picture.budgetRows),
    budgetLinkOffers: picture.budgetLinkOffers,
    netWorthLeavesOut: resolveSnapshotNetWorthScope(snapshot, basis).leftOut,
    ...indexAccounts(ctx, snapshot.getResolvedAccounts()),
  };
}

/** The values a net worth leave-out list can hold, for result schemas. */
export const NET_WORTH_LEFT_OUT_VALUES = [
  "property",
  "mortgage",
  "studentLoan",
  "homeValueMissing",
] as const satisfies readonly NetWorthLeftOut[];

/**
 * Neutral notes saying what net worth counts under the user's choices. They state the choice and
 * never suggest one is better.
 */
export function netWorthBasisNotes(basis: NetWorthBasis, leftOut: readonly NetWorthLeftOut[]) {
  const notes: string[] = [];
  notes.push(
    basis.countStudentLoan
      ? "Student loans count as a debt in net worth and liabilitiesGbp under the user's choices. They are never in debt totals."
      : "Student loans are not counted in net worth under the user's choices. They are never in debt totals.",
  );
  if (!basis.countProperty && (leftOut.includes("property") || leftOut.includes("mortgage"))) {
    notes.push(
      "Property values and mortgage balances are not counted in net worth under the user's choices. propertyGbp and mortgageGbp still show the saved amounts.",
    );
  }
  if (leftOut.includes("homeValueMissing")) {
    notes.push(
      "A mortgage has no home value saved beside it, so net worth counts the mortgage without the home's value.",
    );
  }
  return notes;
}

export const MAX_MISSING = 5;

/** Keeps at most `MAX_MISSING` entries; past that, folds them into one aggregate entry. */
export function capMissing(
  list: Missing[],
  aggregate: Omit<Missing, "field"> & { field: string },
): Missing[] {
  if (list.length <= MAX_MISSING) return list;
  return [
    ...list.slice(0, MAX_MISSING - 1),
    {
      field: aggregate.field,
      why: `${aggregate.why} (${list.length - (MAX_MISSING - 1)} more not listed.)`,
      askUser: aggregate.askUser,
    },
  ];
}

export const ASK_NO_ACCOUNTS: Missing = {
  field: "accounts",
  why: "No accounts are recorded, so balances, net worth and debts are empty rather than zero.",
  askUser:
    "Which accounts do you have, such as current accounts, savings and debts? They can be added in Flump.",
};

/** What a linked line that is not set is missing, for a tool's missing[]. */
export function missingLinkedLines(budgetRows: readonly BudgetEntryItem[]): Missing[] {
  const notSet = new Set<"take_home" | "housing">();
  for (const row of budgetRows) if (row.notSet && row.linked) notSet.add(row.linked);
  return [...notSet].map((kind) =>
    kind === "take_home"
      ? {
          field: "salary",
          why: "An income entry is linked to the take-home pay worked out from the saved salary, and no salary is saved. Income is left unknown rather than counted as zero.",
          askUser: "What is your salary before tax? It can be added in Profile in Flump.",
        }
      : {
          field: "monthlyHousingCost",
          why: "A housing entry is linked to the saved housing payment, and none is saved. It is left out of the totals rather than counted as zero.",
          askUser: "How much is your rent or mortgage payment each month?",
        },
  );
}

export const MISSING_INCOME: Missing = {
  field: "monthlyIncome",
  why: "No income entry in the budget, and no salary saved to work out take-home pay from.",
  askUser: "What is your monthly take-home pay after tax?",
};

/** Category and entry names are free text: scrub them when anonymised. */
export function safeText(text: string, anonymise: boolean): string {
  return sanitiseText(anonymise ? anonymiseDescription(text) : text);
}

/**
 * Labels budget categories for one response (M-PRIV4, ruling 7). Full scope: the category as saved
 * (still sanitised). Anonymised: a built-in category stays as it is, and every custom category,
 * which is free text the user typed ("Jane's nursery"), becomes "Custom category 1", "Custom
 * category 2" in order of first appearance, stable within the response. The rule is the engine's
 * own (`createBudgetCategoryAnonymiser`), shared with the context pack and the backend input.
 */
export function budgetCategoryLabeller(anonymise: boolean): (category: string) => string {
  if (!anonymise) return (category) => safeText(category, false);
  const label = createBudgetCategoryAnonymiser();
  return (category) => sanitiseText(label(category.trim()));
}
