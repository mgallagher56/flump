import { anonymousBudgetEntryLabels, MCP_NOTICE } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import {
  loadReadModel,
  MISSING_INCOME,
  type Missing,
  round2,
  safeText,
  sanitiseText,
  summariseBudget,
  toMonthly,
} from "./common.js";

const result = z.object({
  monthlyIncomeGbp: z.number().nullable(),
  essentialMonthlyGbp: z.number(),
  discretionaryMonthlyGbp: z.number(),
  /** Income minus essential and discretionary spend, before any debt payments. */
  monthlySurplusBeforeDebtGbp: z.number().nullable(),
  entryCount: z.number(),
  notes: z.array(z.string()),
  categories: z.array(
    z.object({ category: z.string(), monthlyGbp: z.number(), essential: z.boolean() }),
  ),
  entries: z
    .array(
      z.object({
        name: z.string(),
        category: z.string(),
        monthlyGbp: z.number(),
        isIncome: z.boolean(),
        isEssential: z.boolean(),
      }),
    )
    .optional(),
});

/** Scrubbing can make two categories identical; merge them so rows stay unique. */
function mergeCategories<T extends { category: string; monthlyGbp: number; essential: boolean }>(
  rows: T[],
): T[] {
  const merged = new Map<string, T>();
  for (const r of rows) {
    const k = `${r.category}|${r.essential}`;
    const cur = merged.get(k);
    if (cur) cur.monthlyGbp = round2(cur.monthlyGbp + r.monthlyGbp);
    else merged.set(k, { ...r });
  }
  return [...merged.values()].sort((a, b) => b.monthlyGbp - a.monthlyGbp);
}

export const getBudgetSummary = defineFlumpTool({
  name: "get_budget_summary",
  title: "Budget summary",
  description:
    "Monthly budget totals from the user's budget entries: income, essential and flexible spending, the amount left over each month, and spending by category. Weekly and annual entries are converted to monthly. Income and the left-over amount are null (with a question in missing[]) when no income entry exists; salary-based guesses are never used. Detailed format lists each entry.",
  input: {},
  result,
  maxTokens: 1500,
  async handler(_input, ctx, { responseFormat }) {
    const m = await loadReadModel(ctx);
    const entries = m.raw.budgetEntries ?? [];
    const b = summariseBudget(entries);
    const missing: Missing[] = [];
    if (!b.hasEntries) {
      missing.push({
        field: "budgetEntries",
        why: "No budget entries are recorded.",
        askUser: "What are your main monthly outgoings, such as rent or mortgage, bills and food?",
      });
    }
    let surplus: number | null = null;
    if (b.monthlyIncome === null) {
      missing.push(MISSING_INCOME);
    } else {
      surplus = round2(b.monthlyIncome - b.essentialMonthly - b.discretionaryMonthly);
    }

    // M-PRIV4: anonymised, an entry name ("Rent to J Smith") never reaches the agent; it becomes
    // the category plus an ordinal ("Housing #2"), or "Income #1" for income.
    const generic = m.anonymise
      ? anonymousBudgetEntryLabels(entries, (category) => sanitiseText(category, 48))
      : undefined;
    const detail =
      responseFormat === "detailed"
        ? entries.map((e, i) => ({
            name: generic ? (generic[i] ?? "Budget entry") : sanitiseText(e.name),
            category: safeText(e.category, m.anonymise),
            monthlyGbp: round2(toMonthly(e.amount, e.frequency)),
            isIncome: e.isIncome,
            isEssential: e.isEssential,
          }))
        : undefined;

    return {
      result: {
        monthlyIncomeGbp: b.monthlyIncome,
        essentialMonthlyGbp: b.essentialMonthly,
        discretionaryMonthlyGbp: b.discretionaryMonthly,
        monthlySurplusBeforeDebtGbp: surplus,
        entryCount: entries.length,
        notes: [
          "The left-over figure here is income minus spending, before any debt payments. get_financial_snapshot gives it after saved minimum payments, and get_debt_overview lists the minimums.",
        ],
        categories: mergeCategories(
          b.byCategory.map((c) => ({
            category: safeText(c.category, m.anonymise),
            monthlyGbp: c.monthly,
            essential: c.essential,
          })),
        ),
        ...(detail ? { entries: detail } : {}),
      },
      provenance: { totals: "budget_entries" },
      missing,
      notice: MCP_NOTICE,
    };
  },
});
