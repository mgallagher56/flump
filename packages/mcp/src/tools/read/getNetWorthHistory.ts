import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { loadReadModel, type Missing, round2 } from "./common.js";

const result = z.object({
  points: z.array(
    z.object({
      month: z.string(),
      netWorthGbp: z.number(),
      assetsGbp: z.number().optional(),
      liabilitiesGbp: z.number().optional(),
    }),
  ),
  changeGbp: z.number().nullable(),
  monthsCovered: z.number(),
});

export const getNetWorthHistory = defineFlumpTool({
  name: "get_net_worth_history",
  title: "Net worth history",
  description:
    "Month-by-month net worth from recorded account history, newest last. Use months to limit the range. Detailed format adds assets and liabilities per month. Returns no points, with a missing[] entry, when no history has been recorded.",
  input: {
    months: z
      .number()
      .int()
      .min(1)
      .max(120)
      .default(12)
      .describe("How many recent months, 1 to 120"),
  },
  result,
  maxTokens: 1500,
  async handler({ months }, ctx, { responseFormat }) {
    const m = await loadReadModel(ctx);
    const history = m.snapshot.getMonthlyHistory(months);
    const missing: Missing[] = [];
    if (history.length === 0) {
      missing.push({
        field: "accountHistory",
        why: "No monthly balance history is recorded for any account.",
        askUser:
          "Would you like to record month-end balances for your accounts so a trend can be shown?",
      });
    }
    const points = history.map((p) => ({
      month: `${p.year}-${String(p.month).padStart(2, "0")}`,
      netWorthGbp: round2(p.netWorth),
      ...(responseFormat === "detailed"
        ? { assetsGbp: round2(p.totalAssets), liabilitiesGbp: round2(p.totalLiabilities) }
        : {}),
    }));
    const first = points[0];
    const last = points[points.length - 1];
    return {
      result: {
        points,
        changeGbp:
          first && last && points.length > 1 ? round2(last.netWorthGbp - first.netWorthGbp) : null,
        monthsCovered: points.length,
      },
      provenance: { points: "account_history" },
      missing,
      notice:
        "Student loans are excluded. A month with no recorded value carries the last known value forward.",
    };
  },
});
