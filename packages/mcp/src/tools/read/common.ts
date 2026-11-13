import {
  anonymiseDescription,
  type BudgetEntryItem,
  type BuildContextPackInput,
  genericAccountLabel,
  PortfolioSnapshot,
  type ResolvedAccount,
} from "@flump/finance-engine";
import { effectiveAnonymize } from "../../auth/scopes.js";
import type { ToolOutput } from "../../envelope.js";
import { shortId, shortIdKey } from "../../short-ids.js";
import type { McpServerContext } from "../../types.js";

export type Missing = NonNullable<ToolOutput<unknown>["missing"]>[number];

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface ReadModel {
  raw: BuildContextPackInput;
  snapshot: PortfolioSnapshot;
  accounts: ResolvedAccount[];
  anonymise: boolean;
  /** Short id for a record, per kind, keyed on the token. */
  idOf(kind: "acc" | "debt", uuid: string): string;
  /** Label shown to the agent: a generic per-type label when anonymised, else the account name. */
  labelOf(account: ResolvedAccount): string;
}

/** Reads the user's data once and builds the shared view every read tool works from. */
export async function loadReadModel(ctx: McpServerContext): Promise<ReadModel> {
  const anonymise = effectiveAnonymize(ctx.token.anonymizeInstitutions, ctx.token.scopes);
  const raw = await ctx.dataProvider.getUserFinancialData(ctx.token.userId, {
    anonymizeInstitutions: anonymise,
  });
  const snapshot = new PortfolioSnapshot(raw.accounts ?? [], raw.accountDetails ?? []);
  const accounts = snapshot.getResolvedAccounts();
  const key = shortIdKey(ctx.token);

  // Per-type ordinals over all accounts in stored order, so a label is stable across tools.
  const ordinals = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const a of accounts) {
    const n = (ordinals.get(a.rawType) ?? 0) + 1;
    ordinals.set(a.rawType, n);
    labels.set(a.id, anonymise ? genericAccountLabel(a.rawType, n) : a.name);
  }

  return {
    raw,
    snapshot,
    accounts,
    anonymise,
    idOf: (kind, uuid) => shortId(key, kind, uuid),
    labelOf: (a) => labels.get(a.id) ?? "Account",
  };
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
  return anonymise ? anonymiseDescription(text) : text;
}
