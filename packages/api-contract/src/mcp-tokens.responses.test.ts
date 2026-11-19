import { describe, expect, it } from "vitest";
import {
  ContextPackResponse,
  CreateMcpTokenRequest,
  CreateMcpTokenResponse,
  McpInputWorkplacePension,
  McpTokenActivityListResponse,
  McpTokenListResponse,
  RevokeMcpTokenResponse,
} from "./domains/mcp-tokens.js";
import { allRoutes } from "./manifest.js";
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
  observations: ["Cash covers 2.7 months of essential spending."],
  portfolio: {
    netWorth: 12500.5,
    totalAssets: 15000,
    homeEstimate: 0,
    totalLiabilities: 2499.5,
    totalLiquidCash: 4000,
    totalInvestments: 6000,
    totalPensions: 5000,
    totalConsumerDebt: 2499.5,
    totalMortgageBalance: 0,
    totalStudentLoans: 0,
    totalSavings: 6000,
    monthlySavingsContributions: 0,
    weightedSavingsRate: 4.1,
    monthlyHistory: [],
    netWorthBasis: { countProperty: true, countStudentLoan: false },
    netWorthLeavesOut: [],
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
    monthlyMinimumsGbp: 75,
    monthlyMinimumsEstimated: true,
    debtFreeDate: null,
    debtFreeDateUnknownReason: "aprUnknown",
    totalInterestGbp: null,
    avalancheVsSnowballComparison: null,
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
  isaAllowance: { allowanceGbp: 20000, usedGbp: null, remainingGbp: null },
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

  it("ContextPackResponse accepts saved facts not in the budget, without the row ids", () => {
    const fact = { link: "housing", monthly: 950, kind: "rent", paymentEstimated: false };
    const withFacts = (facts: unknown[]) => ({
      pack: { ...pack, budgetSummary: { ...pack.budgetSummary, savedFactsNotInBudget: facts } },
      markdown: "",
    });
    expect(checkAgainst(ContextPackResponse, withFacts([fact]))).toEqual({ ok: true });
    expect(
      checkAgainst(
        ContextPackResponse,
        withFacts([{ link: "take_home", monthly: 2750, kind: null, paymentEstimated: false }]),
      ),
    ).toEqual({ ok: true });
    // Row ids are page wiring and stay out of the pack.
    expect(checkAgainst(ContextPackResponse, withFacts([{ ...fact, rowIds: ["b1"] }])).ok).toBe(
      false,
    );
  });

  it("ContextPackResponse rejects a health score, grade or stage (figures only, ruling 2)", () => {
    for (const extra of [
      { healthScore: { overallScore: 62, grade: "C" } },
      { stageEvaluation: { canonicalStage: "STAGE_2_BUFFER_BUILD" } },
    ]) {
      expect(
        checkAgainst(ContextPackResponse, { pack: { ...pack, ...extra }, markdown: "" }).ok,
      ).toBe(false);
    }
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

  it("CreateMcpTokenRequest accepts an optional boolean allowStaging", () => {
    expect(CreateMcpTokenRequest.safeParse({ name: "x", allowStaging: true }).success).toBe(true);
    expect(CreateMcpTokenRequest.safeParse({ name: "x" }).success).toBe(true);
    expect(CreateMcpTokenRequest.safeParse({ name: "x", allowStaging: "yes" }).success).toBe(false);
  });

  const event = {
    id: listed.id,
    toolName: "stage_import",
    outcome: "ok",
    errorCode: null,
    scopesUsed: ["mcp:read:anonymized", "write:stage"],
    clientName: "claude-ai/1.0",
    latencyMs: 12,
    responseBytes: 900,
    createdAt: listed.createdAt,
  };

  it("McpTokenActivityListResponse accepts identifiers and timings only", () => {
    expect(checkAgainst(McpTokenActivityListResponse, [event])).toEqual({ ok: true });
    // The argument fingerprint and any argument field are leaks.
    expect(
      checkAgainst(McpTokenActivityListResponse, [{ ...event, argsFingerprint: "f".repeat(64) }])
        .ok,
    ).toBe(false);
    expect(checkAgainst(McpTokenActivityListResponse, [{ ...event, outcome: "maybe" }]).ok).toBe(
      false,
    );
    // The old paging envelope is gone: the cursor is the X-Next-Cursor header (BE-16, N10).
    expect(
      checkAgainst(McpTokenActivityListResponse, { events: [event], nextBefore: null }).ok,
    ).toBe(false);
  });

  it("the activity route pages like every other list (BE-16, N10)", () => {
    const route = allRoutes.find((r) => r.id === "mcpTokens.activity");
    expect(route?.page).toBe("activity");
    expect(route?.query?.safeParse({ limit: "500" }).success).toBe(true);
    expect(route?.query?.safeParse({ limit: "501" }).success).toBe(false);
    expect(route?.query?.safeParse({ cursor: "not a cursor!" }).success).toBe(false);
    expect(route?.query?.safeParse({ cursor: "MGI2ZjRlMWEtOWMy" }).success).toBe(true);
    expect(route?.query?.safeParse({ before: "MGI2ZjRlMWEtOWMy" }).success).toBe(false);
    expect(route?.query?.safeParse({}).success).toBe(true);
  });
});

describe("McpInputWorkplacePension (slice 6)", () => {
  it("parses a payload from before slice 6 that still carries ratesAssumed, and drops it", () => {
    const older = {
      annualSalary: 40000,
      employeePercent: 5,
      employerPercent: 3,
      isSalarySacrifice: false,
      ratesAssumed: true,
    };
    const parsed = McpInputWorkplacePension.parse(older);
    expect(parsed).toEqual({
      annualSalary: 40000,
      employeePercent: 5,
      employerPercent: 3,
      isSalarySacrifice: false,
    });
  });

  it("parses the new notSet list", () => {
    expect(
      McpInputWorkplacePension.parse({
        annualSalary: 40000,
        employeePercent: 0,
        employerPercent: 3,
        notSet: ["pensionPercent"],
      }).notSet,
    ).toEqual(["pensionPercent"]);
  });
});
