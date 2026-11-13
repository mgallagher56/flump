import {
  evaluateUkStudentLoan,
  getTaxYearVerification,
  resolveUkTaxYear,
  UnsupportedUkTaxYearError,
} from "@flump/finance-engine";
import { z } from "zod";
import { defineFlumpTool } from "../../define-tool.js";
import { FlumpToolError } from "../../errors.js";
import { loadReadModel, type Missing } from "../read/common.js";
import {
  agentSupplied,
  fromProfile,
  gbpInput,
  round2,
  SIMULATE_ANNOTATIONS,
  SIMULATION_NOTICE,
} from "./common.js";

const PLANS = ["plan1", "plan2", "plan4", "plan5", "postgrad"] as const;

const result = z.object({
  plan: z.enum(PLANS),
  balanceGbp: z.number().nullable(),
  annualSalaryGbp: z.number().nullable(),
  repaymentThresholdGbp: z.number().nullable(),
  repaymentRatePct: z.number().nullable(),
  annualRepaymentGbp: z.number().nullable(),
  monthlyRepaymentGbp: z.number().nullable(),
  writeOffYears: z.number().nullable(),
  /** repaid_before_write_off or written_off_first, on the projection described in notes. */
  projectedOutcome: z.enum(["repaid_before_write_off", "written_off_first"]).nullable(),
  notes: z.array(z.string()),
});

export const evaluateStudentLoanOverpayment = defineFlumpTool({
  name: "evaluate_student_loan_overpayment",
  title: "Student loan repayment outlook",
  description:
    "Shows what a UK student loan repays each year at a given salary under the stated plan, and whether the projection clears the balance before the statutory write-off or writes it off first. The plan is required because it is not stored; balance and salary default to recorded values and are listed in missing[] when neither recorded nor supplied. The result describes the projected outcome; it does not say whether to overpay.",
  input: {
    plan: z
      .enum(PLANS)
      .describe("Repayment plan: plan1, plan2, plan4 (Scotland), plan5 or postgrad"),
    balanceGbp: gbpInput(
      "Outstanding loan balance in GBP. Defaults to the recorded student loan balance.",
    ).optional(),
    annualSalaryGbp: gbpInput(
      "Annual gross salary in GBP. Defaults to the salary on the profile.",
    ).optional(),
  },
  result,
  maxTokens: 1500,
  annotations: SIMULATE_ANNOTATIONS,
  async handler(input, ctx) {
    const m = await loadReadModel(ctx);
    const assumptions = [agentSupplied("plan", input.plan, "Repayment plan used.")];
    const missing: Missing[] = [];

    const recordedBalance = m.snapshot.getTotalStudentLoans();
    const balance: number | null =
      input.balanceGbp ?? (recordedBalance > 0 ? recordedBalance : null);
    if (input.balanceGbp !== undefined) {
      assumptions.push(
        agentSupplied("balanceGbp", input.balanceGbp, "Balance supplied in the call."),
      );
    } else if (balance !== null) {
      assumptions.push(
        fromProfile("balanceGbp", round2(balance), "Recorded student loan balance."),
      );
    } else {
      missing.push({
        field: "balanceGbp",
        why: "No student loan balance is recorded and none was supplied.",
        askUser: "What is the outstanding balance on your student loan?",
      });
    }

    const profileSalary = m.raw.baseline?.annualGrossSalary;
    const salary: number | null =
      input.annualSalaryGbp ?? (profileSalary && profileSalary > 0 ? profileSalary : null);
    if (input.annualSalaryGbp !== undefined) {
      assumptions.push(
        agentSupplied("annualSalaryGbp", input.annualSalaryGbp, "Salary supplied in the call."),
      );
    } else if (salary !== null) {
      assumptions.push(fromProfile("annualSalaryGbp", salary, "Gross salary on the profile."));
    } else {
      missing.push({
        field: "annualSalaryGbp",
        why: "No salary is recorded and none was supplied.",
        askUser: "What is your annual gross salary?",
      });
    }

    const taxYear = resolveUkTaxYear();
    const verification = getTaxYearVerification(taxYear);
    const notes = [
      "The projection holds salary and the repayment threshold fixed and charges 6.5% interest on the balance.",
    ];
    const base = {
      result: {
        plan: input.plan,
        balanceGbp: balance === null ? null : round2(balance),
        annualSalaryGbp: salary === null ? null : round2(salary),
        repaymentThresholdGbp: null,
        repaymentRatePct: null,
        annualRepaymentGbp: null,
        monthlyRepaymentGbp: null,
        writeOffYears: null,
        projectedOutcome: null,
        notes,
      },
      taxYear,
      assumptions,
      missing,
      verification,
      provenance: { projectedOutcome: "tax_year_rules" },
      notice: SIMULATION_NOTICE,
    };
    if (balance === null || salary === null) return base;

    let evaluation: ReturnType<typeof evaluateUkStudentLoan>;
    try {
      evaluation = evaluateUkStudentLoan(input.plan, salary, balance, taxYear);
    } catch (err) {
      if (err instanceof UnsupportedUkTaxYearError) {
        throw new FlumpToolError(
          "UNSUPPORTED_TAX_YEAR",
          "No verified student loan figures exist for this plan and tax year.",
          { field: "plan", hint: "Try another plan or ask again after the rules are updated." },
        );
      }
      throw err;
    }
    return {
      ...base,
      result: {
        ...base.result,
        repaymentThresholdGbp: evaluation.threshold,
        repaymentRatePct: evaluation.rate,
        annualRepaymentGbp: round2(evaluation.annualRepayment),
        monthlyRepaymentGbp: round2(evaluation.monthlyRepayment),
        writeOffYears: evaluation.writeOffYears,
        projectedOutcome: evaluation.projectedOutcome,
      },
    };
  },
});
