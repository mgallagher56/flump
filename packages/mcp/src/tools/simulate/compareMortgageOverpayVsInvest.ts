import { calculateMortgageVsIsa } from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { FlumpToolError } from "../../errors.js";
import { resolveShortId, shortIdKey } from "../../short-ids.js";
import { ASK_NO_ACCOUNTS, loadReadModel, type Missing } from "../read/common.js";
import {
  agentSupplied,
  derived,
  gbpInput,
  pctInput,
  round2,
  SIMULATE_ANNOTATIONS,
  SIMULATION_NOTICE,
} from "./common.js";

/** Longest term the account intake accepts; anything else is treated as not recorded. */
const MAX_TERM_MONTHS = 600;

const comparison = z.object({
  mortgageBalanceGbp: z.number(),
  mortgageRatePct: z.number(),
  termMonths: z.number(),
  standardMonthlyPaymentGbp: z.number(),
  overpay: z.object({
    interestSavedGbp: z.number(),
    monthsSaved: z.number(),
    newTermMonths: z.number(),
    totalPaidInOverpaymentsGbp: z.number(),
  }),
  invest: z.object({
    potAtEndOfTermGbp: z.number(),
    totalContributedGbp: z.number(),
    growthGbp: z.number(),
  }),
  /** Investment growth minus mortgage interest saved. Positive means the invested pot ends ahead. */
  investGrowthMinusInterestSavedGbp: z.number(),
});

const result = z.object({
  mortgageAccountId: z.string().nullable(),
  monthlyAmountGbp: z.number(),
  expectedReturnPct: z.number(),
  comparison: comparison.nullable(),
  notes: z.array(z.string()),
});

export const compareMortgageOverpayVsInvest = defineFlumpTool({
  name: "compare_mortgage_overpay_vs_invest",
  title: "Compare mortgage overpayment with investing",
  description:
    "Deprecated: first tool to be removed from this server. Sets the interest saved by overpaying a recorded mortgage by a fixed monthly amount beside the growth on the same amount invested at an expected annual return. Reads the mortgage balance, interest rate and remaining term from the mortgage account; anything not recorded is listed in missing[] and the comparison is left null rather than guessed. The expected return is required and is a single constant rate. The result states both outcomes and their difference; it does not choose between them.",
  input: {
    monthlyAmountGbp: gbpInput("Monthly amount in GBP to compare (up to 100,000)", 100_000),
    expectedReturnPct: pctInput(
      "Assumed constant annual return on the invested amount, as a percentage (5 means 5%). Supplied by the user or agent; there is no default.",
    ),
    mortgageAccountId: z
      .string()
      .max(40)
      .optional()
      .describe("Mortgage account id from list_accounts. Needed only when there is more than one."),
  },
  result,
  maxTokens: 1500,
  annotations: SIMULATE_ANNOTATIONS,
  async handler(input, ctx) {
    const m = await loadReadModel(ctx);
    const mortgages = m.accounts.filter((a) => a.category === "mortgages");
    const assumptions = [
      agentSupplied("monthlyAmountGbp", input.monthlyAmountGbp, "Monthly amount you asked about."),
      agentSupplied(
        "expectedReturnPct",
        input.expectedReturnPct,
        "Constant annual return assumed for the invested amount.",
      ),
    ];
    const notes: string[] = [
      "Investment growth uses one constant return, with no charges, tax or market fall modelled.",
      "The mortgage rate is held at its recorded value for the whole term.",
      "Returns are nominal and compounded monthly at the annual rate divided by 12.",
      "If overpaying pays off the mortgage early, the overpaying side stops paying then. The invested side keeps adding the same amount to the end of the term.",
    ];
    const empty = (missing: Missing[], accountId: string | null = null) => ({
      result: {
        mortgageAccountId: accountId,
        monthlyAmountGbp: input.monthlyAmountGbp,
        expectedReturnPct: input.expectedReturnPct,
        comparison: null,
        notes,
      },
      assumptions,
      missing,
      provenance: { comparison: "mortgage_account" },
      notice: SIMULATION_NOTICE,
    });

    if (m.accounts.length === 0) return empty([ASK_NO_ACCOUNTS]);
    if (mortgages.length === 0) {
      return empty([
        {
          field: "mortgage",
          why: "No mortgage account is recorded, so there is no balance, rate or term to work from.",
          askUser: "What is your outstanding mortgage balance, interest rate and remaining term?",
        },
      ]);
    }

    let account = mortgages.length === 1 ? mortgages[0] : undefined;
    if (input.mortgageAccountId !== undefined) {
      account = resolveShortId(shortIdKey(ctx.token), "acc", mortgages, input.mortgageAccountId);
      if (!account) {
        throw new FlumpToolError("NOT_FOUND", "No mortgage account matches mortgageAccountId.", {
          field: "mortgageAccountId",
          hint: "Use an id of type Mortgage from list_accounts.",
        });
      }
    }
    if (!account) {
      return empty([
        {
          field: "mortgageAccountId",
          why: `There are ${mortgages.length} mortgage accounts, so one must be chosen.`,
          askUser: `Which mortgage should be used: ${mortgages
            .map((a) => `${m.refOf(a)} (${m.idOf("acc", a.id)})`)
            .join(", ")}?`,
        },
      ]);
    }

    const id = m.idOf("acc", account.id);
    const ref = m.refOf(account);
    const raw = (m.raw.accounts ?? []).find((a) => a.id === account.id);
    const termMonths = Number(raw?.termMonths);
    const missing: Missing[] = [];
    if (!(account.nominalBalance > 0)) {
      missing.push({
        field: `accounts.${id}.balance`,
        why: `The balance on ${ref} (${id}) is zero or not recorded.`,
        askUser: `What is the outstanding balance on your ${ref}?`,
      });
    }
    if (!account.interestRateKnown) {
      missing.push({
        field: `accounts.${id}.interestRate`,
        why: `The interest rate on ${ref} (${id}) is not recorded.`,
        askUser: `What interest rate are you paying on your ${ref}?`,
      });
    }
    if (!(Number.isFinite(termMonths) && termMonths > 0 && termMonths <= MAX_TERM_MONTHS)) {
      missing.push({
        field: `accounts.${id}.termMonths`,
        why: `The remaining term on ${ref} (${id}) is not recorded or is outside 1 to ${MAX_TERM_MONTHS} months.`,
        askUser: `How many months are left on your ${ref} (1 to ${MAX_TERM_MONTHS})?`,
      });
    }
    if (missing.length > 0) return empty(missing, id);

    const balance = account.nominalBalance;
    const rate = account.interestRate;
    const vs = calculateMortgageVsIsa(
      balance,
      rate,
      termMonths / 12,
      input.monthlyAmountGbp,
      input.expectedReturnPct,
    );
    assumptions.push(
      derived(
        "mortgageTerms",
        "Balance, interest rate and remaining term read from the mortgage account.",
      ),
    );

    return {
      result: {
        mortgageAccountId: id,
        monthlyAmountGbp: input.monthlyAmountGbp,
        expectedReturnPct: input.expectedReturnPct,
        comparison: {
          mortgageBalanceGbp: round2(balance),
          mortgageRatePct: rate,
          termMonths,
          standardMonthlyPaymentGbp: round2(vs.standardPayment),
          overpay: {
            interestSavedGbp: round2(vs.interestSaved),
            monthsSaved: vs.monthsShaved,
            newTermMonths: termMonths - vs.monthsShaved,
            totalPaidInOverpaymentsGbp: round2(
              input.monthlyAmountGbp * (termMonths - vs.monthsShaved),
            ),
          },
          invest: {
            potAtEndOfTermGbp: round2(vs.isaAccumulatedValue),
            totalContributedGbp: round2(vs.totalIsaContributed),
            growthGbp: round2(vs.isaGrowth),
          },
          investGrowthMinusInterestSavedGbp: round2(vs.isaGrowth - vs.interestSaved),
        },
        notes,
      },
      assumptions,
      provenance: { comparison: "mortgage_account" },
      notice: SIMULATION_NOTICE,
    };
  },
});
