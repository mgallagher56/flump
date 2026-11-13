import {
  type AccountCategory,
  anonymiseDescription,
  type BudgetEntryItem,
  type BuildContextPackInput,
  genericAccountLabel,
  PortfolioSnapshot,
  type ResolvedAccount,
} from "@flump/finance-engine";
import { effectiveAnonymize } from "../../auth/scopes.js";
import type { ToolOutput } from "../../envelope.js";
import { resolveShortId, shortId, shortIdKey } from "../../short-ids.js";
import type { McpServerContext } from "../../types.js";

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
  raw: BuildContextPackInput;
  snapshot: PortfolioSnapshot;
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
  return { raw, snapshot, ...indexAccounts(ctx, snapshot.getResolvedAccounts()) };
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
    "Which accounts and balances should I add? Start with current accounts, savings and any debts.",
};

export interface MonthlyBudget {
  hasEntries: boolean;
  monthlyIncome: number | null;
  essentialMonthly: number;
  discretionaryMonthly: number;
  byCategory: Array<{ category: string; monthly: number; essential: boolean }>;
}

export function toMonthly(amount: number, frequency: string): number {
  if (frequency === "weekly") return (amount * 52) / 12;
  if (frequency === "annual") return amount / 12;
  return amount;
}

/** Budget totals from entries only. Income is null when no income entry exists (no salary-based guess). */
export function summariseBudget(entries: readonly BudgetEntryItem[]): MonthlyBudget {
  let income = 0;
  let hasIncome = false;
  let essential = 0;
  let discretionary = 0;
  const cats = new Map<string, { monthly: number; essential: boolean }>();
  for (const e of entries) {
    const m = toMonthly(e.amount, e.frequency);
    if (e.isIncome) {
      hasIncome = true;
      income += m;
      continue;
    }
    if (e.isEssential) essential += m;
    else discretionary += m;
    const k = `${e.category}|${e.isEssential}`;
    const cur = cats.get(k) ?? { monthly: 0, essential: e.isEssential };
    cur.monthly += m;
    cats.set(k, cur);
  }
  return {
    hasEntries: entries.length > 0,
    monthlyIncome: hasIncome ? round2(income) : null,
    essentialMonthly: round2(essential),
    discretionaryMonthly: round2(discretionary),
    byCategory: [...cats.entries()]
      .map(([k, v]) => ({
        category: k.slice(0, k.lastIndexOf("|")),
        monthly: round2(v.monthly),
        essential: v.essential,
      }))
      .sort((a, b) => b.monthly - a.monthly),
  };
}

export const MISSING_INCOME: Missing = {
  field: "monthlyIncome",
  why: "No income entry in the budget, and profile-derived take-home is not available to this tool yet.",
  askUser: "What is your monthly take-home pay after tax?",
};

/** Category and entry names are free text: scrub them when anonymised. */
export function safeText(text: string, anonymise: boolean): string {
  return sanitiseText(anonymise ? anonymiseDescription(text) : text);
}
