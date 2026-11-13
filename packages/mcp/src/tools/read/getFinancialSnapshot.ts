import {
  getUkCalendarDate,
  MCP_NOTICE,
  PortfolioSnapshot,
  selectNetWorthSeries,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { FlumpToolError } from "../../errors.js";
import { monthLabel, parseMonth } from "../../provider/in-memory.js";
import type { McpServerContext } from "../../types.js";
import {
  ASK_NO_ACCOUNTS,
  indexAccounts,
  loadReadModel,
  MISSING_INCOME,
  type Missing,
  round2,
  summariseBudget,
} from "./common.js";

const result = z.object({
  netWorthGbp: z.number(),
  assetsGbp: z.number(),
  liabilitiesGbp: z.number(),
  liquidCashGbp: z.number(),
  investmentsGbp: z.number(),
  pensionsGbp: z.number(),
  propertyGbp: z.number(),
  consumerDebtGbp: z.number(),
  mortgageGbp: z.number(),
  /** Null for an asOfMonth answer: student loans are not kept in monthly history. */
  studentLoanGbp: z.number().nullable(),
  accountCount: z.number(),
  debtCount: z.number(),
  monthlyIncomeGbp: z.number().nullable(),
  monthlyEssentialSpendGbp: z.number().nullable(),
  /** Income minus essential and discretionary spend minus STORED debt minimums only. */
  monthlySurplusAfterStoredMinimumsGbp: z.number().nullable(),
  emergencyRunwayMonths: z.number().nullable(),
  /** "YYYY-MM" when the balances are as at a past month, else null (current balances). */
  asOfMonth: z.string().nullable(),
  notes: z.array(z.string()),
});

export const getFinancialSnapshot = defineFlumpTool({
  name: "get_financial_snapshot",
  title: "Financial snapshot",
  description:
    "One-call summary of the user's finances: net worth, assets, liabilities, cash, investments, pensions, debts and (when a budget exists) monthly surplus and emergency runway. Built only from recorded accounts and budget entries; anything not recorded is null and listed in missing[] with a question to ask the user. Pass asOfMonth (YYYY-MM) for balances as at the end of a past month, from recorded monthly history (budget figures are then null, as the budget is not kept by month). Start here before drilling into other tools.",
  input: {
    asOfMonth: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM, such as 2025-04")
      .optional()
      .describe("Balances as at the end of this past month (YYYY-MM); omit for current balances"),
  },
  result,
  maxTokens: 1500,
  async handler({ asOfMonth }, ctx) {
    // A past month needs only the accounts and that month's rows, never the whole history.
    if (asOfMonth) return historicalSnapshot(ctx, asOfMonth);
    const m = await loadReadModel(ctx);
    const s = m.snapshot;
    const budget = summariseBudget(m.raw.budgetEntries ?? []);
    const missing: Missing[] = [];
    const provenance: Record<string, string> = {
      netWorthGbp: "account_balances",
      debtCount: "account_balances",
    };

    if (m.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);

    const income = budget.monthlyIncome;
    const essential = budget.hasEntries ? budget.essentialMonthly : null;
    const assumptions: Array<{ field: string; source: "default"; reason: string }> = [];
    let surplus: number | null = null;
    let runway: number | null = null;
    if (income === null) {
      missing.push(MISSING_INCOME);
      provenance.monthlyIncomeGbp = "not_available";
      provenance.monthlySurplusAfterStoredMinimumsGbp = "not_available";
    } else {
      const debts = s.toDebtItems();
      const stored = debts.filter((d) => !d.minimumPaymentEstimated);
      const estimatedCount = debts.length - stored.length;
      const minStored = stored.reduce(
        (sum, d) => sum + (d.minimumPaymentGbp ?? d.minimumPayment ?? 0),
        0,
      );
      surplus = round2(income - budget.essentialMonthly - budget.discretionaryMonthly - minStored);
      provenance.monthlyIncomeGbp = "budget_entries";
      provenance.monthlySurplusAfterStoredMinimumsGbp = "budget_entries_and_stored_debt_minimums";
      if (estimatedCount > 0) {
        assumptions.push({
          field: "monthlySurplusAfterStoredMinimumsGbp",
          source: "default",
          reason: `${estimatedCount} debt(s) have no stored minimum payment, so no minimum is subtracted for them; the surplus is overstated by their minimums.`,
        });
        missing.push({
          field: "debts.minimumPayment",
          why: `${estimatedCount} debt(s) have no recorded minimum payment, so the surplus excludes them.`,
          askUser: "What is the minimum monthly payment on each of your debts?",
        });
      }
    }
    if (essential !== null && essential > 0) {
      runway = Math.round((s.getTotalLiquidCash() / essential) * 10) / 10;
      provenance.emergencyRunwayMonths = "account_balances_and_budget_entries";
    } else {
      missing.push({
        field: "monthlyEssentialSpendGbp",
        why: "No essential spending entries in the budget, so emergency runway cannot be worked out.",
        askUser:
          "Roughly how much do you spend each month on essentials (rent or mortgage, bills, food)?",
      });
    }

    return {
      result: {
        netWorthGbp: round2(s.getTotalNetWorth()),
        assetsGbp: round2(s.getTotalAssets()),
        liabilitiesGbp: round2(s.getTotalLiabilities()),
        liquidCashGbp: round2(s.getTotalLiquidCash()),
        investmentsGbp: round2(s.getTotalInvestments()),
        pensionsGbp: round2(s.getTotalPensions()),
        propertyGbp: round2(s.getTotalProperty()),
        consumerDebtGbp: round2(s.getTotalConsumerDebt()),
        mortgageGbp: round2(s.getTotalMortgageBalance()),
        studentLoanGbp: round2(s.getTotalStudentLoans()),
        accountCount: m.accounts.length,
        debtCount: s.toDebtItems().length,
        monthlyIncomeGbp: income,
        monthlyEssentialSpendGbp: essential,
        monthlySurplusAfterStoredMinimumsGbp: surplus,
        emergencyRunwayMonths: runway,
        asOfMonth: null,
        notes: [
          "Student loans are income-contingent and excluded from net worth and debt totals.",
          "Monthly surplus is after stored (not estimated) minimum debt payments.",
        ],
      },
      provenance,
      missing,
      assumptions,
      notice: MCP_NOTICE,
    };
  },
});

/** Balances as at the end of a past month, from the recorded monthly rows (carry-forward, E30). */
async function historicalSnapshot(ctx: McpServerContext, asOfMonth: string) {
  const asOf = parseMonth(asOfMonth) as number;
  // Month keys are Europe/London months (E30), so "now" is the London month too.
  if (asOf > (parseMonth(getUkCalendarDate(new Date()).slice(0, 7)) as number)) {
    throw new FlumpToolError("INVALID_ARGUMENT", "asOfMonth is in the future.", {
      field: "asOfMonth",
      hint: "Use a past or the current month, or omit it for current balances.",
    });
  }
  const rawAccounts = await ctx.dataProvider.getAccounts(ctx.token.userId);
  const m = indexAccounts(ctx, new PortfolioSnapshot(rawAccounts, []).getResolvedAccounts());
  const tracked = m.accounts.filter((a) => a.category !== "studentLoans");
  const rows =
    tracked.length === 0
      ? []
      : await ctx.dataProvider.getAccountSnapshots(ctx.token.userId, {
          from: asOfMonth,
          to: asOfMonth,
          accountIds: tracked.map((a) => a.id),
        });
  const series = selectNetWorthSeries(
    tracked.map((a) => ({ id: a.id, type: a.rawType })),
    rows,
    { through: monthLabel(asOf) },
  );
  const point = series.find((p) => p.month === asOfMonth);
  const values = new Map((point?.accounts ?? []).map((v) => [v.accountId, v.value]));
  const raw = rawAccounts.filter((a) => values.has(String(a.id)));
  const s = new PortfolioSnapshot(
    raw.map((a) => ({ ...a, balance: values.get(String(a.id)) })),
    [],
  );
  const missing: Missing[] = [];
  if (m.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);
  else if (values.size === 0) {
    missing.push({
      field: "accountHistory",
      why: `No month-end balance is recorded on or before ${asOfMonth}.`,
      askUser: "Would you like to record month-end balances for your accounts for that month?",
    });
  } else if (values.size < tracked.length) {
    missing.push({
      field: "accountHistory.accounts",
      why: `${tracked.length - values.size} of ${tracked.length} account(s) have no month-end balance on or before ${asOfMonth}, so they are left out.`,
      askUser: "Would you like to record month-end balances for the accounts with no history?",
    });
  }
  const carried = (point?.accounts ?? []).filter((v) => v.carried).length;
  return {
    result: {
      netWorthGbp: round2(s.getTotalNetWorth()),
      assetsGbp: round2(s.getTotalAssets()),
      liabilitiesGbp: round2(s.getTotalLiabilities()),
      liquidCashGbp: round2(s.getTotalLiquidCash()),
      investmentsGbp: round2(s.getTotalInvestments()),
      pensionsGbp: round2(s.getTotalPensions()),
      propertyGbp: round2(s.getTotalProperty()),
      consumerDebtGbp: round2(s.getTotalConsumerDebt()),
      mortgageGbp: round2(s.getTotalMortgageBalance()),
      studentLoanGbp: null,
      accountCount: values.size,
      debtCount: s.toDebtItems().length,
      monthlyIncomeGbp: null,
      monthlyEssentialSpendGbp: null,
      monthlySurplusAfterStoredMinimumsGbp: null,
      emergencyRunwayMonths: null,
      asOfMonth,
      notes: [
        `Balances are month-end values recorded for ${asOfMonth}; ${carried} of ${values.size} account(s) repeat their last earlier value because nothing was recorded that month.`,
        "Student loans and budget figures are not kept by month, so they are null here.",
      ],
    },
    provenance: { netWorthGbp: "account_history", monthlyIncomeGbp: "not_historical" },
    missing,
    notice: MCP_NOTICE,
  };
}
