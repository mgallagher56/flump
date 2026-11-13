import {
  calculateDebtSchedule,
  type DebtItem,
  type DebtPayoffResult,
  type DebtPayoffStrategy,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { FlumpToolError } from "../../errors.js";
import { ASK_NO_ACCOUNTS, capMissing, loadReadModel, type Missing } from "../read/common.js";
import {
  agentSupplied,
  defaulted,
  derived,
  gbpInput,
  round2,
  SIMULATE_ANNOTATIONS,
  SIMULATION_NOTICE,
} from "./common.js";

export const MAX_DEBTS = 20;
export const MAX_MONTHLY_ROWS = 24;
const MAX_YEARLY_ROWS = 30;

const STRATEGY_NAMES = ["avalanche", "snowball", "minimum_only"] as const;
type StrategyName = (typeof STRATEGY_NAMES)[number];

const strategyResult = z.object({
  strategy: z.enum(STRATEGY_NAMES),
  payoffAchievable: z.boolean(),
  monthsToPayoff: z.number().nullable(),
  debtFreeDate: z.string().nullable(),
  totalInterestPaidGbp: z.number(),
  interestSavedVsMinimumGbp: z.number(),
});

const scheduleRow = z.object({
  period: z.string(),
  paymentsGbp: z.number(),
  interestGbp: z.number(),
  principalGbp: z.number(),
  remainingDebtGbp: z.number(),
});

const result = z.object({
  simulated: z.boolean(),
  debtsIncluded: z.number(),
  /** Ids of debts left out because their APR is not recorded and none was supplied. */
  debtsExcludedUnknownApr: z.array(z.string()),
  startingDebtGbp: z.number(),
  extraMonthlyGbp: z.number(),
  strategies: z.array(strategyResult),
  scheduleStrategy: z.enum(["avalanche", "snowball"]).nullable(),
  schedule: z.array(scheduleRow).optional(),
  scheduleTruncated: z.boolean().optional(),
  notes: z.array(z.string()),
});

const debtInput = z.object({
  accountId: z.string().max(40).describe("Debt id from get_debt_overview"),
  aprPct: z.number().min(0).max(100).optional().describe("APR as a percentage (22.9 means 22.9%)"),
  minimumPaymentGbp: gbpInput("Monthly minimum payment in GBP", 100_000).optional(),
});

function toStrategyResult(strategy: StrategyName, r: DebtPayoffResult) {
  return {
    strategy,
    payoffAchievable: r.payoffAchievable,
    monthsToPayoff: r.payoffAchievable ? r.monthsToPayoff : null,
    debtFreeDate: r.payoffAchievable ? r.debtFreeDate : null,
    totalInterestPaidGbp: round2(r.totalInterestPaidGbp),
    interestSavedVsMinimumGbp: round2(r.interestSavedVsMinimumGbp),
  };
}

function toRows(
  schedule: DebtPayoffResult["schedule"],
  mode: "yearly" | "monthly",
): { rows: z.infer<typeof scheduleRow>[]; truncated: boolean } {
  if (mode === "monthly") {
    return {
      rows: schedule.slice(0, MAX_MONTHLY_ROWS).map((s) => ({
        period: s.calendarDate,
        paymentsGbp: round2(s.totalPaymentsGbp),
        interestGbp: round2(s.totalInterestGbp),
        principalGbp: round2(s.totalPrincipalGbp),
        remainingDebtGbp: round2(s.remainingDebtGbp),
      })),
      truncated: schedule.length > MAX_MONTHLY_ROWS,
    };
  }
  const rows: z.infer<typeof scheduleRow>[] = [];
  for (let i = 0; i < schedule.length; i += 12) {
    const chunk = schedule.slice(i, i + 12);
    const last = chunk[chunk.length - 1];
    if (!last) continue;
    rows.push({
      period: `Year ${i / 12 + 1}`,
      paymentsGbp: round2(chunk.reduce((s, c) => s + c.totalPaymentsGbp, 0)),
      interestGbp: round2(chunk.reduce((s, c) => s + c.totalInterestGbp, 0)),
      principalGbp: round2(chunk.reduce((s, c) => s + c.totalPrincipalGbp, 0)),
      remainingDebtGbp: round2(last.remainingDebtGbp),
    });
  }
  return { rows: rows.slice(0, MAX_YEARLY_ROWS), truncated: rows.length > MAX_YEARLY_ROWS };
}

export const simulateDebtPayoff = defineFlumpTool({
  name: "simulate_debt_payoff",
  title: "Simulate debt payoff",
  description:
    "Simulates paying off the user's recorded consumer debts (up to 20) with an optional extra monthly amount, under the avalanche (highest APR first) and snowball (smallest balance first) orderings, against minimum payments only. Debts with no recorded APR are left out and listed in missing[] unless an APR is supplied in debts[]; an APR is never guessed. Minimum payments that are not recorded are estimated and flagged. includeSchedule adds a yearly or monthly (at most 24 months) table for the first strategy. Student loans and mortgages are not included.",
  input: {
    strategy: z
      .enum(["avalanche", "snowball", "compare"])
      .default("compare")
      .describe("Ordering to simulate; compare returns avalanche, snowball and minimum-only"),
    extraMonthlyGbp: gbpInput(
      "Extra amount paid each month on top of the minimums, in GBP. Omit for none.",
      100_000,
    ).optional(),
    includeSchedule: z
      .enum(["none", "yearly", "monthly"])
      .default("none")
      .describe("Payment schedule detail; monthly stops after 24 months"),
    debts: z
      .array(debtInput)
      .max(MAX_DEBTS)
      .optional()
      .describe("APR or minimum payment to use for specific debts, when not recorded"),
  },
  result,
  maxTokens: 3000,
  annotations: SIMULATE_ANNOTATIONS,
  async handler(input, ctx) {
    const m = await loadReadModel(ctx);
    const items = m.snapshot.toDebtItems();
    if (items.length > MAX_DEBTS) {
      throw new FlumpToolError("INVALID_ARGUMENT", `More than ${MAX_DEBTS} debts are recorded.`, {
        hint: "Simulate again once some debts are cleared or combined.",
      });
    }
    const idByUuid = new Map(items.map((d) => [d.id, m.idOf("acc", d.id)]));
    const acctByUuid = new Map(m.accounts.map((a) => [a.id, a]));

    const overrides = new Map<string, { aprPct?: number; minimumPaymentGbp?: number }>();
    for (const o of input.debts ?? []) {
      const uuid = items.find((d) => idByUuid.get(d.id) === o.accountId)?.id;
      if (!uuid) {
        throw new FlumpToolError("NOT_FOUND", "A debts[] entry does not match a recorded debt.", {
          field: "debts.accountId",
          hint: "Use ids from get_debt_overview.",
        });
      }
      overrides.set(uuid, { aprPct: o.aprPct, minimumPaymentGbp: o.minimumPaymentGbp });
    }

    const extra = input.extraMonthlyGbp ?? 0;
    const assumptions = [
      input.extraMonthlyGbp === undefined
        ? defaulted("extraMonthlyGbp", 0, "No extra payment given, so minimums only.")
        : agentSupplied("extraMonthlyGbp", extra, "Extra monthly payment used."),
    ];
    const aprMissing: Missing[] = [];
    const excluded: string[] = [];
    const sim: DebtItem[] = [];
    let anyEstimated = false;

    for (const d of items) {
      const id = idByUuid.get(d.id) as string;
      const acct = acctByUuid.get(d.id);
      const ref = acct ? m.refOf(acct) : "Debt account";
      const o = overrides.get(d.id);
      if (!d.aprKnown && o?.aprPct === undefined) {
        excluded.push(id);
        aprMissing.push({
          field: `debts.${id}.aprPct`,
          why: `The APR on ${ref} (${id}) is not recorded, so it was left out of the simulation.`,
          askUser: `What is the APR on your ${ref}?`,
        });
        continue;
      }
      const apr = o?.aprPct ?? d.interestRateApr ?? d.apr ?? 0;
      const minimum = o?.minimumPaymentGbp ?? d.minimumPaymentGbp ?? d.minimumPayment ?? 0;
      if (o?.aprPct !== undefined) {
        assumptions.push(agentSupplied(`debts.${id}.aprPct`, apr, "APR supplied in the call."));
      }
      if (o?.minimumPaymentGbp !== undefined) {
        assumptions.push(
          agentSupplied(
            `debts.${id}.minimumPaymentGbp`,
            minimum,
            "Minimum payment supplied in the call.",
          ),
        );
      } else if (d.minimumPaymentEstimated) {
        anyEstimated = true;
      }
      const balance = d.balanceGbp ?? d.balance ?? 0;
      sim.push({
        ...d,
        // The short id, so the engine never carries a user-typed name into its output.
        name: id,
        balance,
        balanceGbp: balance,
        apr,
        interestRateApr: apr,
        minimumPayment: minimum,
        minimumPaymentGbp: minimum,
      });
    }
    if (anyEstimated) {
      assumptions.push(
        derived(
          "minimumPaymentGbp",
          "Minimum payments that are not recorded are estimated as the greater of 25 pounds or 2.5% of the balance.",
        ),
      );
    }

    const missing: Missing[] = [
      ...(m.accounts.length === 0 ? [ASK_NO_ACCOUNTS] : []),
      ...capMissing(aprMissing, {
        field: "debts.aprPct",
        why: "Several debts have no recorded APR and were left out of the simulation.",
        askUser: "What is the APR on each of your debts?",
      }),
    ];
    const notes = [
      "Interest is charged monthly at the APR divided by 12. Rates, balances and payments stay fixed.",
    ];
    const startingDebtGbp = round2(sim.reduce((s, d) => s + (d.balanceGbp ?? 0), 0));
    const envelope = { assumptions, missing, provenance: { strategies: "account_balances" } };

    if (sim.length === 0 || startingDebtGbp <= 0) {
      if (excluded.length === 0 && m.accounts.length > 0) {
        notes.push("No consumer debts are recorded, so there is nothing to simulate.");
      }
      return {
        result: {
          simulated: false,
          debtsIncluded: 0,
          debtsExcludedUnknownApr: excluded,
          startingDebtGbp: 0,
          extraMonthlyGbp: extra,
          strategies: [],
          scheduleStrategy: null,
          notes,
        },
        ...envelope,
        notice: SIMULATION_NOTICE,
      };
    }

    const run = (strategy: DebtPayoffStrategy, extraGbp: number) =>
      calculateDebtSchedule(sim, extraGbp, strategy);
    const picks: Array<{ strategy: DebtPayoffStrategy; name: "avalanche" | "snowball" }> =
      input.strategy === "compare"
        ? [
            { strategy: "AVALANCHE", name: "avalanche" },
            { strategy: "SNOWBALL", name: "snowball" },
          ]
        : input.strategy === "snowball"
          ? [{ strategy: "SNOWBALL", name: "snowball" }]
          : [{ strategy: "AVALANCHE", name: "avalanche" }];
    const runs = picks.map((p) => ({ ...p, r: run(p.strategy, extra) }));
    const strategies = [
      ...runs.map((x) => toStrategyResult(x.name, x.r)),
      toStrategyResult("minimum_only", run("AVALANCHE", 0)),
    ];
    const primary = runs[0] as (typeof runs)[number];

    if (strategies.some((s) => !s.payoffAchievable)) {
      notes.push(
        "At least one ordering does not clear the debts within 30 years at these payments.",
      );
    }
    const out: z.infer<typeof result> = {
      simulated: true,
      debtsIncluded: sim.length,
      debtsExcludedUnknownApr: excluded,
      startingDebtGbp,
      extraMonthlyGbp: extra,
      strategies,
      scheduleStrategy: primary.name,
      notes,
    };
    if (input.includeSchedule !== "none") {
      const { rows, truncated } = toRows(primary.r.schedule, input.includeSchedule);
      out.schedule = rows;
      out.scheduleTruncated = truncated;
    }

    return { result: out, ...envelope, notice: SIMULATION_NOTICE };
  },
});
