import { describe, expect, it } from "vitest";
import {
  ContextPackResponse,
  CreateMcpTokenResponse,
  McpTokenListResponse,
  RevokeMcpTokenResponse,
} from "./domains/mcp-tokens.js";
import { checkAgainst } from "./validate.js";

// Built at runtime and low-entropy so secret scanners do not read the fixture as a real key.
const MASKED_PREFIX = ["flump", "pat", "0000...0000"].join("_");

const listed = {
  id: "0b6f4e1a-9c2d-4e3f-a1b2-c3d4e5f60718",
  name: "Claude Desktop",
  tokenPrefix: MASKED_PREFIX,
  scopes: ["mcp:read:anonymized", "mcp:simulate"],
  anonymizeInstitutions: true,
  expiresAt: "2027-02-11T10:00:00.000Z",
  lastUsedAt: null,
  totalToolCalls: 0,
  createdAt: "2026-11-13T10:00:00.000Z",
  isRevoked: false,
  isExpired: false,
};

const created = {
  id: listed.id,
  name: listed.name,
  tokenPrefix: listed.tokenPrefix,
  rawToken: `flump_pat_${"0".repeat(32)}`,
  scopes: listed.scopes,
  anonymizeInstitutions: true,
  expiresAt: listed.expiresAt,
  createdAt: listed.createdAt,
};

const pack = {
  metadata: {
    generatedAt: "2026-11-13T10:00:00.000Z",
    schemaVersion: "1.0.0",
    isAnonymized: true,
    currency: "GBP",
  },
  baseline: { userId: "anonymous-user", annualGrossSalary: 42000 },
  stageEvaluation: { canonicalStage: "BUILD_BUFFER", headline: "Build your buffer" },
  healthScore: { overallScore: 62, grade: "C", observations: [] },
  portfolio: {
    netWorth: 12500.5,
    totalAssets: 15000,
    totalLiabilities: 2499.5,
    totalLiquidCash: 4000,
    totalInvestments: 6000,
    totalPensions: 5000,
    totalConsumerDebt: 2499.5,
    totalMortgageBalance: 0,
    weightedSavingsRate: 4.1,
    monthlyHistory: [],
    accounts: [
      {
        id: "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c11",
        name: "Current Account #1",
        rawType: "Current",
        category: "cash",
        isAsset: true,
        isLiability: false,
        nominalBalance: 4000,
        netWorthBalance: 4000,
        latestBalance: 4000,
        overdrawnAmount: 0,
        interestRate: 0,
        interestRateKnown: false,
        monthlyContribution: 0,
        monthlyContributionKnown: false,
        currency: "GBP",
        latestMonth: 10,
        latestYear: 2026,
        history: [],
      },
    ],
  },
  debtSummary: {
    consumerDebts: [],
    totalStartingDebtGbp: 2499.5,
    avalancheVsSnowballComparison: { interestSavedAvalancheVsMin: 0 },
    promoCliffAlerts: [],
  },
  budgetSummary: {
    monthlyIncome: 2750,
    essentialBillsMonthly: 1500,
    discretionarySpendMonthly: 400,
    plannedSavingsMonthly: null,
    monthlySurplus: 850,
    safeToSpend: {
      weeklyAllowance: 90,
      dailyAllowance: 13,
      monthlyDiscretionary: 390,
      fixedCommitments: 1500,
    },
    emergencyRunwayMonths: 2.7,
    entries: [
      {
        id: "b1",
        category: "Housing",
        name: "Rent",
        amount: 950,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
    ],
  },
  taxSummary: { currentTaxYear: "2026/27", ukTaxCalculation: { adjustedNetIncomeGbp: 39900 } },
};

describe("mcp-tokens response schemas", () => {
  it("McpTokenListResponse accepts listed tokens and rejects a leaked hash", () => {
    expect(checkAgainst(McpTokenListResponse, [listed])).toEqual({ ok: true });
    expect(checkAgainst(McpTokenListResponse, [{ ...listed, tokenHash: "f".repeat(64) }]).ok).toBe(
      false,
    );
  });

  it("McpTokenListResponse never carries the plaintext token", () => {
    expect(checkAgainst(McpTokenListResponse, [{ ...listed, rawToken: created.rawToken }]).ok).toBe(
      false,
    );
  });

  it("CreateMcpTokenResponse accepts the once-only plaintext token", () => {
    expect(checkAgainst(CreateMcpTokenResponse, created)).toEqual({ ok: true });
    expect(checkAgainst(CreateMcpTokenResponse, { ...created, tokenHash: "f".repeat(64) }).ok).toBe(
      false,
    );
  });

  it("rejects a full token in the prefix field", () => {
    expect(
      checkAgainst(CreateMcpTokenResponse, { ...created, tokenPrefix: created.rawToken }).ok,
    ).toBe(false);
  });

  it("RevokeMcpTokenResponse accepts success only", () => {
    expect(checkAgainst(RevokeMcpTokenResponse, { success: true })).toEqual({ ok: true });
    expect(checkAgainst(RevokeMcpTokenResponse, { success: true, id: listed.id }).ok).toBe(false);
  });

  it("ContextPackResponse accepts a serialised pack", () => {
    expect(checkAgainst(ContextPackResponse, { pack, markdown: "# FLUMP" })).toEqual({ ok: true });
  });

  it("ContextPackResponse flags a provider field leaking into a pack account", () => {
    const [account] = pack.portfolio.accounts;
    const leaked = {
      ...pack,
      portfolio: { ...pack.portfolio, accounts: [{ ...account, externalAccountId: "acc_x" }] },
    };
    expect(checkAgainst(ContextPackResponse, { pack: leaked, markdown: "" }).ok).toBe(false);
  });

  it("ContextPackResponse rejects an extra pack key and a total as a string", () => {
    expect(
      checkAgainst(ContextPackResponse, { pack: { ...pack, userEmail: "x" }, markdown: "" }).ok,
    ).toBe(false);
    expect(
      checkAgainst(ContextPackResponse, {
        pack: { ...pack, portfolio: { ...pack.portfolio, netWorth: "12500.50" } },
        markdown: "",
      }).ok,
    ).toBe(false);
  });
});
