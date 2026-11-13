import type { AccountCategory } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { ASK_NO_ACCOUNTS, loadReadModel, type Missing, round2 } from "./common.js";

const CATEGORIES = [
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

const result = z.object({
  accounts: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      category: z.enum(CATEGORIES),
      balanceGbp: z.number(),
      isLiability: z.boolean(),
      interestRatePct: z.number().nullable(),
      aprStatus: z.enum(["known", "unknown"]),
    }),
  ),
  total: z.number(),
});

export const listAccounts = defineFlumpTool({
  name: "list_accounts",
  title: "List accounts",
  description:
    "Lists the user's accounts with a short opaque id, a label, category and balance. Liabilities show the amount owed as a positive number with isLiability true. Institution names are replaced with generic labels unless the token has full read access.",
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
    const rows = m.accounts
      .filter((a) => !category || a.category === category)
      .map((a) => ({
        id: m.idOf("acc", a.id),
        label: m.labelOf(a),
        category: a.category,
        balanceGbp: round2(a.nominalBalance),
        isLiability: a.isLiability,
        interestRatePct: a.interestRateKnown ? a.interestRate : null,
        aprStatus: a.interestRateKnown ? ("known" as const) : ("unknown" as const),
      }));
    const unknownDebt = rows.filter((r) => r.aprStatus === "unknown" && r.category === "debt");
    for (const r of unknownDebt) {
      missing.push({
        field: `accounts.${r.id}.interestRatePct`,
        why: `The interest rate on ${r.label} is not recorded.`,
        askUser: `What is the APR on your ${r.label}?`,
      });
    }
    return {
      result: { accounts: rows, total: rows.length },
      provenance: { accounts: "account_balances" },
      missing,
    };
  },
});
