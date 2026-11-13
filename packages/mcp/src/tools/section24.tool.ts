import {
  calculateSection24Tax,
  calculateUKTax,
  isSupportedUkTaxYear,
  SUPPORTED_UK_TAX_YEARS,
} from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { defaultTaxYear, taxVerificationFields } from "../assumptions.js";
import type { McpServerContext } from "../types.js";

export const section24Schema = {
  taxYear: z
    .enum(SUPPORTED_UK_TAX_YEARS)
    .optional()
    .describe("UK fiscal tax year for Self-Assessment (defaults to the current UK tax year)"),
  hypotheticalFreelanceProfitGbp: z
    .number()
    .min(0)
    .optional()
    .describe("Optional freelance/self-employed net profit in GBP"),
  hypotheticalBtlRentGbp: z
    .number()
    .min(0)
    .optional()
    .describe("Annual gross Buy-to-Let rental income in GBP"),
  hypotheticalBtlMortgageInterestGbp: z
    .number()
    .min(0)
    .optional()
    .describe("Annual residential property finance/mortgage interest in GBP"),
  hypotheticalAllowableExpensesGbp: z
    .number()
    .min(0)
    .optional()
    .describe(
      "Annual allowable letting agent, maintenance, insurance and service charge expenses in GBP",
    ),
  ownershipSharePct: z
    .number()
    .min(1)
    .max(100)
    .default(100)
    .describe("Percentage share of property ownership (e.g. 50% for joint ownership, 100% sole)"),
};

export function registerSection24Tool(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  server.registerTool(
    "calculate_self_assessment_and_section24",
    {
      title: "Self Assessment and Section 24 calculator",
      description:
        "Computes HMRC Self-Assessment tax liability, Section 24 landlord finance cost restrictions (20% basic rate tax credit), 31 Jan and 31 Jul Payments on Account, and required monthly tax pot set-aside.",
      inputSchema: section24Schema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const fallbackYear = args.taxYear ? undefined : defaultTaxYear();
      const taxYear: string = args.taxYear ?? (fallbackYear?.taxYear as string);
      if (!isSupportedUkTaxYear(taxYear)) {
        // calculateUKTax is strict (E22): reject an unsupported year as a tool error, never guess.
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "UNSUPPORTED_TAX_YEAR",
                message: `Tax year "${taxYear}" is not supported. Supported years: ${SUPPORTED_UK_TAX_YEARS.join(", ")}.`,
              }),
            },
          ],
        };
      }
      const ctx = await getContext();
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId);
      const b = rawData.baseline;

      // 1. Check if user has stored multi-year tax records
      const hasStoredRecords = rawData.taxRecords && rawData.taxRecords.length > 0;
      let saLedger: any = null;

      if (hasStoredRecords && rawData.taxRecords) {
        saLedger = calculateUKTax(
          taxYear,
          rawData.taxRecords,
          b.annualGrossSalary,
          args.ownershipSharePct ?? b.propertyOwnershipSharePct ?? 100,
        );
      }

      // 2. Compute standalone Section 24 calculation
      const otherIncome = b.annualGrossSalary + (args.hypotheticalFreelanceProfitGbp ?? 0);
      const rentalIncome =
        args.hypotheticalBtlRentGbp ?? (saLedger ? saLedger.rentalIncomeGross : 0);
      const mortgageInterest =
        args.hypotheticalBtlMortgageInterestGbp ?? (saLedger ? saLedger.rentalMortgageInterest : 0);
      const allowableExpenses =
        args.hypotheticalAllowableExpensesGbp ??
        (saLedger ? saLedger.rentalExpensesExclInterest : 0);

      const s24Result = calculateSection24Tax({
        grossRentalIncomeGbp: rentalIncome,
        allowableExpensesGbp: allowableExpenses,
        mortgageInterestGbp: mortgageInterest,
        otherTaxableIncomeGbp: otherIncome,
        ownershipSharePct: args.ownershipSharePct,
        taxYear,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              taxYear,
              ...taxVerificationFields(taxYear),
              assumptions: fallbackYear?.assumptions ?? [],
              section24Analysis: {
                grossRentalIncomeGbp: s24Result.shareRentalIncomeGbp,
                allowableExpensesGbp: s24Result.shareAllowableExpensesGbp,
                mortgageInterestGbp: s24Result.shareMortgageInterestGbp,
                taxableRentalProfitGbp: s24Result.taxableRentalProfitGbp,
                section24TaxCreditGbp: s24Result.section24TaxCreditGbp,
                netRentalTaxLiabilityGbp: s24Result.netRentalTaxLiabilityGbp,
                effectiveRentalTaxRatePct: s24Result.effectiveRentalTaxRatePct,
                actualCashProfitGbp: s24Result.actualCashProfit,
                section24PenaltyVsOldRulesGbp: s24Result.section24Penalty,
                isHigherRateTaxpayer: s24Result.isHigherRate,
              },
              hmrcPaymentSchedule: {
                balancingPayment31JanGbp: s24Result.balancingPayment31JanGbp,
                firstPaymentOnAccount31JanGbp: s24Result.firstPaymentOnAccount31JanGbp,
                totalDue31JanGbp: s24Result.totalDue31JanGbp,
                secondPaymentOnAccount31JulyGbp: s24Result.secondPaymentOnAccount31JulyGbp,
                monthlySetAsideEstimateGbp: s24Result.recommendedMonthlyTaxSetAsideGbp,
              },
              storedLedgerSummary: saLedger
                ? {
                    totalGrossIncomeGbp: saLedger.totalGrossIncome,
                    totalTaxDueGbp: saLedger.totalTaxDue,
                    netAdditionalTaxToPayGbp: saLedger.netAdditionalTaxToPay,
                    seProfitGbp: saLedger.seProfit,
                    seTaxDueGbp: saLedger.seTaxDue,
                    seClass4NIDueGbp: saLedger.seClass4NIDue,
                    savingsTaxDueGbp: saLedger.savingsTaxDue,
                    dividendTaxDueGbp: saLedger.dividendTaxDue,
                  }
                : undefined,
            }),
          },
        ],
      };
    },
  );
}
