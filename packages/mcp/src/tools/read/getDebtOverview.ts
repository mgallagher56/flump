import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { ASK_NO_ACCOUNTS, capMissing, loadReadModel, type Missing, round2 } from "./common.js";

const result = z.object({
  debts: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.string(),
      balanceGbp: z.number(),
      aprPct: z.number().nullable(),
      aprStatus: z.enum(["known", "unknown"]),
      minimumPaymentGbp: z.number(),
      minimumPaymentStatus: z.enum(["stored", "estimated"]),
    }),
  ),
  totalConsumerDebtGbp: z.number(),
  overdrawnGbp: z.number(),
  totalMinimumPaymentsGbp: z.number(),
  weightedAprPct: z.number().nullable(),
  mortgageGbp: z.number(),
  studentLoanGbp: z.number(),
});

export const getDebtOverview = defineFlumpTool({
  name: "get_debt_overview",
  title: "Debt overview",
  description:
    "The user's debts: each consumer debt with balance, APR and minimum payment, plus totals for overdrafts, mortgage and student loans. An unrecorded APR is reported as null with aprStatus unknown and a question in missing[]; it is never guessed. Minimum payments that are not recorded are estimated and flagged. No payoff schedules; use a simulation tool for those.",
  input: {},
  result,
  maxTokens: 1500,
  async handler(_input, ctx) {
    const m = await loadReadModel(ctx);
    const items = m.snapshot.toDebtItems();
    const byId = new Map(m.accounts.map((a) => [a.id, a]));
    const aprMissing: Missing[] = [];

    const debts = items.map((d) => {
      const acct = byId.get(d.id);
      const id = m.idOf("acc", d.id);
      const label = acct ? m.labelOf(acct) : "Debt";
      if (!d.aprKnown) {
        aprMissing.push({
          field: `debts.${id}.aprPct`,
          why: `The APR on ${label} is not recorded, so interest cost cannot be worked out.`,
          askUser: `What is the APR on your ${label}?`,
        });
      }
      return {
        id,
        label,
        type: d.type ?? "loan",
        balanceGbp: round2(d.balanceGbp ?? d.balance ?? 0),
        aprPct: d.aprKnown ? (d.interestRateApr ?? d.apr ?? 0) : null,
        aprStatus: d.aprKnown ? ("known" as const) : ("unknown" as const),
        minimumPaymentGbp: round2(d.minimumPaymentGbp ?? d.minimumPayment ?? 0),
        minimumPaymentStatus: d.minimumPaymentEstimated
          ? ("estimated" as const)
          : ("stored" as const),
      };
    });

    const missing: Missing[] = [
      ...(m.accounts.length === 0 ? [ASK_NO_ACCOUNTS] : []),
      ...capMissing(aprMissing, {
        field: "debts.aprPct",
        why: "Several debts have no recorded APR, so interest cost cannot be worked out.",
        askUser: "What is the APR on each of your debts?",
      }),
    ];
    const known = debts.filter((d) => d.aprPct !== null);
    const knownBalance = known.reduce((s, d) => s + d.balanceGbp, 0);
    const weightedApr =
      knownBalance > 0
        ? Math.round(
            (known.reduce((s, d) => s + d.balanceGbp * (d.aprPct ?? 0), 0) / knownBalance) * 100,
          ) / 100
        : null;

    const hasEstimated = debts.some((d) => d.minimumPaymentStatus === "estimated");
    const notices = [
      "Student loans are income-contingent and not counted as debt here.",
      ...(known.length < debts.length ? ["Weighted APR covers debts with a known APR only."] : []),
      ...(hasEstimated
        ? ["Some minimum payments are estimated (greater of 25 pounds or 2.5% of balance)."]
        : []),
    ];

    return {
      result: {
        debts,
        totalConsumerDebtGbp: round2(m.snapshot.getTotalConsumerDebt()),
        overdrawnGbp: round2(m.accounts.reduce((s, a) => s + a.overdrawnAmount, 0)),
        totalMinimumPaymentsGbp: round2(debts.reduce((s, d) => s + d.minimumPaymentGbp, 0)),
        weightedAprPct: weightedApr,
        mortgageGbp: round2(m.snapshot.getTotalMortgageBalance()),
        studentLoanGbp: round2(m.snapshot.getTotalStudentLoans()),
      },
      provenance: { debts: "account_balances" },
      missing,
      notice: notices.join(" "),
    };
  },
});
