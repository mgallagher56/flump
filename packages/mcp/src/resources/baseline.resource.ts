import { buildFlumpAiContextPack, type FlumpAiContextPack } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServerContext } from "../types.js";

export function registerBaselineResources(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  // 1. flump://context/executive-snapshot
  server.resource("executive-snapshot", "flump://context/executive-snapshot", async (uri) => {
    const ctx = await getContext();
    let pack = ctx.contextPack;
    if (!pack) {
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId, {
        anonymizeInstitutions: ctx.token.anonymizeInstitutions,
      });
      pack = buildFlumpAiContextPack(rawData, {
        anonymizeInstitutions: ctx.token.anonymizeInstitutions,
      });
      ctx.contextPack = pack;
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(pack, null, 2),
        },
      ],
    };
  });

  // 2. flump://context/baseline
  server.resource("baseline", "flump://context/baseline", async (uri) => {
    const ctx = await getContext();
    let pack = ctx.contextPack;
    if (!pack) {
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId, {
        anonymizeInstitutions: ctx.token.anonymizeInstitutions,
      });
      pack = buildFlumpAiContextPack(rawData, {
        anonymizeInstitutions: ctx.token.anonymizeInstitutions,
      });
      ctx.contextPack = pack;
    }

    const payload = {
      baseline: pack.baseline,
      stageEvaluation: pack.stageEvaluation,
      healthScore: pack.healthScore,
      allowances: pack.taxSummary.ukTaxCalculation.allowances,
      taxTrap: pack.taxSummary.ukTaxCalculation.taxTrap,
    };

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  });

  // 3. flump://rules/uk-fiscal-guardrails
  server.resource("uk-fiscal-guardrails", "flump://rules/uk-fiscal-guardrails", async (uri) => {
    const guardrails = {
      taxYears: ["2025/26", "2026/27"],
      personalAllowanceGbp: 12570,
      taxTrapBand: {
        lowerThresholdGbp: 100000,
        upperThresholdGbp: 125140,
        taperRate: "£1 lost allowance per £2 adjusted net income over £100k",
        effectiveMarginalRateEwniPct: 60.0,
        effectiveMarginalRateScotlandPct: 67.5,
      },
      isaAnnualAllowanceGbp: 20000,
      pensionAnnualAllowanceGbp: 60000,
      personalSavingsAllowance: {
        basicRateGbp: 1000,
        higherRateGbp: 500,
        additionalRateGbp: 0,
      },
      nationalInsurance: {
        employeePrimaryThresholdGbp: 12570,
        employeeUpperEarningsLimitGbp: 50270,
        employeeMainRatePct: 8.0,
        employeeUpperRatePct: 2.0,
        employerSecondaryThresholdGbp: 5000,
        employerRatePct: 15.0,
      },
      studentLoanRepaymentThresholds: {
        plan1: { thresholdGbp: 26900, ratePct: 9.0, writeOffYears: 25 },
        plan2: { thresholdGbp: 29385, ratePct: 9.0, writeOffYears: 30 },
        plan4_scotland: { thresholdGbp: 33795, ratePct: 9.0, writeOffYears: 30 },
        plan5: { thresholdGbp: 25000, ratePct: 9.0, writeOffYears: 40 },
        postgraduate: { thresholdGbp: 21000, ratePct: 6.0, writeOffYears: 30 },
      },
      section24Rules: {
        deductibility:
          "Mortgage interest cannot be deducted from gross rental income to calculate taxable profit.",
        taxCreditPct: 20.0,
        paymentsOnAccount:
          "If SA liability > £1,000, payments on account are due 31 Jan and 31 Jul (50% each).",
      },
      scotlandIncomeTaxBands: [
        { name: "Starter", from: 0, to: 2827, ratePct: 19.0 },
        { name: "Basic", from: 2827, to: 14921, ratePct: 20.0 },
        { name: "Intermediate", from: 14921, to: 31092, ratePct: 21.0 },
        { name: "Higher", from: 31092, to: 62430, ratePct: 42.0 },
        { name: "Advanced", from: 62430, to: 125140, ratePct: 45.0 },
        { name: "Top", from: 125140, ratePct: 48.0 },
      ],
    };

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(guardrails, null, 2),
        },
      ],
    };
  });
}
