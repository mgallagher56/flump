import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import {
  ASK_NO_ACCOUNTS,
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
  studentLoanGbp: z.number(),
  accountCount: z.number(),
  debtCount: z.number(),
  monthlyIncomeGbp: z.number().nullable(),
  monthlyEssentialSpendGbp: z.number().nullable(),
  /** Income minus essential and discretionary spend minus STORED debt minimums only. */
  monthlySurplusAfterStoredMinimumsGbp: z.number().nullable(),
  emergencyRunwayMonths: z.number().nullable(),
});

export const getFinancialSnapshot = defineFlumpTool({
  name: "get_financial_snapshot",
  title: "Financial snapshot",
  description:
    "One-call summary of the user's finances: net worth, assets, liabilities, cash, investments, pensions, debts and (when a budget exists) monthly surplus and emergency runway. Built only from recorded accounts and budget entries; anything not recorded is null and listed in missing[] with a question to ask the user. Start here before drilling into other tools.",
  input: {},
  result,
  maxTokens: 1500,
  async handler(_input, ctx) {
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
      },
      provenance,
      missing,
      assumptions,
      notice:
        "Student loans are income-contingent and excluded from net worth and debt totals. Monthly surplus is after stored (not estimated) minimum debt payments.",
    };
  },
});
