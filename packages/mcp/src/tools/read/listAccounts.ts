import { MCP_NOTICE, type RawAccount } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import {
  ACCOUNT_CATEGORIES,
  ASK_NO_ACCOUNTS,
  capMissing,
  loadReadModel,
  type Missing,
  round2,
} from "./common.js";

const CATEGORIES = ACCOUNT_CATEGORIES;

const result = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      category: z.enum(CATEGORIES),
      balanceGbp: z.number(),
      isLiability: z.boolean(),
      interestRatePct: z.number().nullable(),
      /** Debts only. */
      aprStatus: z.enum(["known", "unknown"]).optional(),
      /** Mortgages only, when stored: remaining term in months. */
      termMonths: z.number().nullable().optional(),
      /** Mortgages only, when stored: the day the fixed rate ends (YYYY-MM-DD). */
      fixedRateEndDate: z.string().nullable().optional(),
      /** Pensions only, when stored: the monthly contribution in GBP. */
      monthlyContributionGbp: z.number().nullable().optional(),
    }),
  ),
  /** Number of accounts in this response (after the category filter), not the user's total. */
  returnedCount: z.number(),
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Stored mortgage terms, validated: anything malformed is reported as not stored (null). */
function mortgageDetails(raw: RawAccount | undefined) {
  const term = Number(raw?.termMonths);
  const end = raw?.fixedRateEndDate;
  return {
    termMonths: raw?.termMonths != null && Number.isInteger(term) && term >= 0 ? term : null,
    fixedRateEndDate: typeof end === "string" && ISO_DATE.test(end) ? end : null,
  };
}

export const listAccounts = defineFlumpTool({
  name: "list_accounts",
  title: "List accounts",
  description:
    "Lists the user's accounts with a short opaque id, a label, category and balance. Debts, mortgages and student loans show the amount owed as a positive number, with isLiability true. Mortgages add the remaining term and fixed-rate end date, and pensions the monthly contribution, when stored (null when not). Institution names are replaced with generic labels unless the token has full read access.",
  input: {
    category: z
      .enum(CATEGORIES)
      .optional()
      .describe("Only accounts in this category, such as debt or savings"),
  },
  result,
  maxTokens: 1500,
  async handler({ category }, ctx) {
    const m = await loadReadModel(ctx);
    const missing: Missing[] = [];
    if (m.accounts.length === 0) missing.push(ASK_NO_ACCOUNTS);
    const refs = new Map(m.accounts.map((a) => [m.idOf("acc", a.id), m.refOf(a)]));
    const stored = new Map((m.raw.accounts ?? []).map((a) => [String(a.id), a]));
    const rows = m.accounts
      .filter((a) => !category || a.category === category)
      .map((a) => ({
        id: m.idOf("acc", a.id),
        label: m.labelOf(a),
        category: a.category,
        balanceGbp: round2(a.nominalBalance),
        isLiability: a.isLiability,
        interestRatePct: a.interestRateKnown ? a.interestRate : null,
        ...(a.category === "debt"
          ? { aprStatus: a.interestRateKnown ? ("known" as const) : ("unknown" as const) }
          : {}),
        ...(a.category === "mortgages" ? mortgageDetails(stored.get(a.id)) : {}),
        ...(a.category === "pensions"
          ? {
              monthlyContributionGbp: a.monthlyContributionKnown
                ? round2(a.monthlyContribution)
                : null,
            }
          : {}),
      }));
    const unknownDebt = rows.filter((r) => r.aprStatus === "unknown");
    const debtMissing: Missing[] = [];
    for (const r of unknownDebt) {
      debtMissing.push({
        field: `accounts.${r.id}.interestRatePct`,
        why: `The APR on ${refs.get(r.id) ?? "Debt account"} (${r.id}) is not recorded.`,
        askUser: `What is the APR on your ${refs.get(r.id) ?? "Debt account"}?`,
      });
    }
    missing.push(
      ...capMissing(debtMissing, {
        field: "accounts.interestRatePct",
        why: "Several debts have no recorded APR.",
        askUser: "What is the APR on each of your debts?",
      }),
    );
    return {
      result: { accounts: rows, returnedCount: rows.length },
      provenance: { accounts: "account_balances" },
      missing,
      notice: MCP_NOTICE,
    };
  },
});
