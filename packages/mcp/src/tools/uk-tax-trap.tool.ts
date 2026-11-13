import { calculateUkTax, SUPPORTED_UK_TAX_YEARS, type UkTaxYear } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { defaultTaxYear, taxVerificationFields } from "../assumptions.js";
import type { McpServerContext } from "../types.js";

export const ukTaxTrapSchema = {
  hypotheticalGrossSalaryGbp: z
    .number()
    .min(0)
    .optional()
    .describe("Gross annual PAYE salary in GBP (defaults to user baseline salary)"),
  bonusGbp: z
    .number()
    .min(0)
    .default(0)
    .describe("One-off bonus or side income received in this tax year"),
  employeePensionPct: z
    .number()
    .min(0)
    .max(100)
    .describe("Employee pension contribution percentage (e.g. 5, 10, 25)"),
  isSalarySacrifice: z
    .boolean()
    .default(true)
    .describe(
      "Whether pension contribution is via salary sacrifice (reduces National Insurance & Adjusted Net Income)",
    ),
  giftAidContributionsGbp: z
    .number()
    .min(0)
    .default(0)
    .describe(
      "Net annual Gift Aid charitable donations in GBP (grossed up by 1.25x to extend basic rate band and reclaim Personal Allowance)",
    ),
  region: z
    .enum(["ENGLAND_NI_WALES", "SCOTLAND"])
    .optional()
    .describe("UK tax region (Scotland applies distinct Scottish Income Tax bands)"),
  taxYear: z
    .enum(SUPPORTED_UK_TAX_YEARS)
    .optional()
    .describe("UK tax year to evaluate (defaults to the current UK tax year)"),
};

export function registerUkTaxTrapTool(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  server.registerTool(
    "simulate_uk_tax_and_pension_sacrifice",
    {
      title: "UK tax trap and pension sacrifice",
      description:
        "Calculates UK income tax, National Insurance, Scottish bands, and the £100k-£125,140 60% tax trap. Simulates optimal pension salary sacrifice and Gift Aid contributions to reclaim the £12,570 Personal Allowance.",
      inputSchema: ukTaxTrapSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const ctx = await getContext();
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId);
      const b = rawData.baseline;

      const grossSalary = args.hypotheticalGrossSalaryGbp ?? b.annualGrossSalary;
      const region = args.region ?? b.ukRegion ?? "ENGLAND_NI_WALES";
      const fallbackYear = args.taxYear ? undefined : defaultTaxYear();
      const taxYear = args.taxYear ?? (fallbackYear?.taxYear as UkTaxYear);

      // 1. Calculate Baseline result (before hypothetical sacrifice/bonus)
      const baselineResult = calculateUkTax({
        grossSalary,
        bonusOrSideIncome: 0,
        pensionContributionPct: b.pensionContributionPct,
        isSalarySacrifice: b.isSalarySacrifice,
        studentLoanPlan: b.studentLoanPlan,
        region,
        taxYear,
        includeEmployerNiRebate: true,
      });

      // 2. Calculate Simulated result
      const simulatedResult = calculateUkTax({
        grossSalary,
        bonusOrSideIncome: args.bonusGbp,
        pensionContributionPct: args.employeePensionPct,
        isSalarySacrifice: args.isSalarySacrifice,
        giftAidContributionsGbp: args.giftAidContributionsGbp,
        studentLoanPlan: b.studentLoanPlan,
        region,
        taxYear,
        includeEmployerNiRebate: true,
      });

      const taxSavedVsBaseline = Math.max(
        0,
        baselineResult.incomeTaxGbp +
          baselineResult.nationalInsuranceGbp -
          (simulatedResult.incomeTaxGbp + simulatedResult.nationalInsuranceGbp),
      );

      const personalAllowanceReclaimed = Math.max(
        0,
        simulatedResult.taxTrap.effectivePersonalAllowanceGbp -
          baselineResult.taxTrap.effectivePersonalAllowanceGbp,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              taxYear: simulatedResult.taxYear,
              ...taxVerificationFields(simulatedResult.taxYear),
              assumptions: fallbackYear?.assumptions ?? [],
              region,
              grossIncomeGbp: simulatedResult.grossIncomeGbp,
              adjustedNetIncomeGbp: simulatedResult.adjustedNetIncomeGbp,
              netTakeHomeAnnualGbp: simulatedResult.netTakeHomePayAnnualGbp,
              netTakeHomeMonthlyGbp: simulatedResult.netTakeHomePayMonthlyGbp,
              incomeTaxGbp: simulatedResult.incomeTaxGbp,
              nationalInsuranceGbp: simulatedResult.nationalInsuranceGbp,
              totalDeductionsGbp: simulatedResult.totalDeductionsGbp,
              effectiveTaxRatePct: simulatedResult.effectiveTaxRatePct,
              taxSavedVsBaselineGbp: taxSavedVsBaseline,
              personalAllowanceReclaimedGbp: personalAllowanceReclaimed,
              employerNiSavingsGbp: simulatedResult.employerNiSavingsGbp ?? 0,
              taxTrapStatus: {
                isInTaxTrap: simulatedResult.taxTrap.isInTaxTrap,
                effectivePersonalAllowanceGbp:
                  simulatedResult.taxTrap.effectivePersonalAllowanceGbp,
                lostPersonalAllowanceGbp: simulatedResult.taxTrap.lostPersonalAllowance,
                marginalRatePct: simulatedResult.taxTrap.marginalRatePct,
                contributionRequiredToEscapeGbp:
                  simulatedResult.taxTrap.contributionRequiredToEscapeGbp,
                taxSavedByEscapingGbp: simulatedResult.taxTrap.estimatedTaxSavedByEscapingGbp,
              },
              allowancesStatus: {
                remainingPensionAllowanceGbp:
                  simulatedResult.allowances.pensionAllowanceRemainingGbp,
                usedPensionAllowanceGbp: simulatedResult.allowances.pensionAllowanceUsedGbp,
                remainingIsaAllowanceGbp: simulatedResult.allowances.isaAllowanceRemainingGbp,
              },
            }),
          },
        ],
      };
    },
  );
}
