import {
  anonymousBudgetEntryLabels,
  budgetRowMonthly,
  isFigureKnown,
  MCP_NOTICE,
  resolveBudgetEntrySharePercent,
  selectBudgetByCategory,
  selectBudgetTotals,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import {
  budgetCategoryLabeller,
  loadReadModel,
  MISSING_INCOME,
  type Missing,
  missingLinkedLines,
  round2,
  sanitiseText,
} from "./common.js";

const result = z.object({
  monthlyIncomeGbp: z.number().nullable(),
  /** Essential entries, savings entries left out. Debt entries marked essential are included. */
  essentialMonthlyGbp: z.number(),
  /** Every other spending entry, savings entries left out. */
  discretionaryMonthlyGbp: z.number(),
  /** Entries in the savings category, whatever their essential flag. */
  savingsMonthlyGbp: z.number(),
  /**
   * Left over each month, as the Dashboard shows it: income minus essential, discretionary and
   * savings entries. Debt payments count only where they are budget entries. The key name is
   * kept for existing clients.
   */
  monthlySurplusBeforeDebtGbp: z.number().nullable(),
  entryCount: z.number(),
  notes: z.array(z.string()),
  /**
   * Saved figures that are not in this budget: the budget has entries of that kind of its own and
   * the user has not added the saved figure or chosen an entry for it to replace. Not counted.
   */
  savedFiguresNotInBudget: z.array(
    z.object({
      figure: z.enum(["take_home_pay", "rent", "mortgage_payment", "household_contribution"]),
      monthlyGbp: z.number(),
      estimated: z.boolean(),
    }),
  ),
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
        /**
         * The percentage monthlyGbp is taken at: 100 when sole, the user's share when joint. A line
         * linked to an account or the housing payment shows that source's share (E34 C1); null
         * when the housing payment adds mortgages held at different shares.
         */
        sharePercent: z.number().nullable(),
      }),
    )
    .optional(),
});

/** Scrubbing can make two categories identical; merge them so rows stay unique. */
const NOT_IN_BUDGET_FIGURE = {
  take_home: "take_home_pay",
  rent: "rent",
  mortgage: "mortgage_payment",
  household: "household_contribution",
} as const;

const NOT_IN_BUDGET_NAME = {
  take_home_pay: "take-home pay",
  rent: "rent",
  mortgage_payment: "mortgage payment",
  household_contribution: "household contribution",
} as const;

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
    "Monthly budget totals from the user's budget entries: income, essential and flexible spending, savings, the amount left over each month (the figure the Dashboard shows), and spending by category. Weekly and annual entries are converted to monthly, and an entry marked joint counts at the user's share. With no income entry, income is the take-home pay worked out from the saved salary, as in the Flump budget; a saved take-home pay or housing payment that the budget does not include is listed in savedFiguresNotInBudget and not counted. Income and the left-over amount are null (with a question in missing[]) when neither exists. Detailed format lists each entry.",
  input: {},
  result,
  maxTokens: 1500,
  async handler(_input, ctx, { responseFormat }) {
    const m = await loadReadModel(ctx);
    // The budget as the picture resolved it: linked lines in place, shadowed rows left out.
    const entries = m.budgetEntries;
    const rows = m.picture.budgetRows;
    // A linked line whose saved fact is not set makes the picture's totals unknown. Spending is
    // still known: it is the same selector over the lines that are set. Income and left over stay
    // unknown, never counted with a £0 line.
    const notSetMissing = missingLinkedLines(rows, m.picture.takeHome);
    const totalsFigure = isFigureKnown(m.picture.budget)
      ? m.picture.budget
      : notSetMissing.length > 0
        ? selectBudgetTotals(rows.filter((row) => !row.notSet))
        : m.picture.budget;
    const totals = isFigureKnown(totalsFigure) ? totalsFigure.value : null;
    const missing: Missing[] = [];
    if (entries.length === 0) {
      missing.push({
        field: "budgetEntries",
        why: "No budget entries are recorded.",
        askUser: "What are your main monthly outgoings, such as rent or mortgage, bills and food?",
      });
    }
    // Income and left over are null without an income entry, or with a linked line not set.
    missing.push(...notSetMissing);
    const incomeKnown = totals?.hasIncome === true && notSetMissing.length === 0;
    const income = incomeKnown ? totals.income : null;
    const surplus = incomeKnown ? totals.surplus : null;
    if (!totals?.hasIncome && notSetMissing.length === 0) missing.push(MISSING_INCOME);

    // M-PRIV4 and ruling 7: anonymised, neither an entry name ("Rent to J Smith") nor a custom
    // category name ("Jane's nursery") reaches the agent. A custom category becomes "Custom
    // category 1"; an entry becomes a neutral label by group ("Bills 2", "Income 1", or "Entry 1"
    // in a custom category). One labeller per response keeps the numbering consistent, and the
    // categories are labelled in entry order before the totals are sorted.
    const categoryLabel = budgetCategoryLabeller(m.anonymise);
    const categories = entries.map((e) => categoryLabel(e.category));
    const generic = m.anonymise ? anonymousBudgetEntryLabels(entries) : undefined;
    const detail =
      responseFormat === "detailed"
        ? entries.map((e, i) => ({
            name: generic ? (generic[i] ?? "Entry") : sanitiseText(e.name),
            category: categories[i] ?? categoryLabel(e.category),
            monthlyGbp: round2(budgetRowMonthly(e)),
            isIncome: e.isIncome,
            isEssential: e.isEssential,
            sharePercent: e.linked
              ? (e.sourceSharePercent ?? null)
              : resolveBudgetEntrySharePercent(e),
          }))
        : undefined;

    const notInBudget = m.budgetLinkOffers.map((offer) => ({
      figure:
        NOT_IN_BUDGET_FIGURE[offer.link === "take_home" ? "take_home" : (offer.kind ?? "rent")],
      monthlyGbp: round2(offer.monthly),
      estimated: offer.paymentEstimated,
    }));
    const notInBudgetNotes = notInBudget.map(
      (f) =>
        `The user's saved ${NOT_IN_BUDGET_NAME[f.figure]} of ${f.estimated ? "about " : ""}£${f.monthlyGbp.toLocaleString("en-GB", { maximumFractionDigits: 0 })} a month is not in this budget and is not counted in these totals. The budget has its own entries of that kind; the user can add the saved figure or choose an entry for it to replace on the budget page.`,
    );

    return {
      result: {
        monthlyIncomeGbp: income,
        essentialMonthlyGbp: totals?.essentials ?? 0,
        discretionaryMonthlyGbp: totals?.discretionary ?? 0,
        savingsMonthlyGbp: totals?.savings ?? 0,
        monthlySurplusBeforeDebtGbp: surplus,
        entryCount: entries.length,
        notes: [
          "Left over is income minus essential, flexible and savings entries, as on the Dashboard. Categories add up to those three totals; savings entries are listed as not essential.",
          ...notInBudgetNotes,
        ],
        savedFiguresNotInBudget: notInBudget,
        categories: mergeCategories(
          selectBudgetByCategory(rows).map((c) => ({
            category: categoryLabel(c.category),
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
