import { ContextPackResponse } from "@flump/api-contract";
import { describe, expect, it, vi } from "vitest";
import { PAT_REJECTED_MESSAGE, PatRejectedError, packToInput, runStdio } from "./stdio.js";

const PAT = "flump_pat_0123456789abcdef0123456789abcdef";

// The real GET /v1/mcp-tokens/context-pack shape (ContextPackResponse), not a hand-made one.
const pack = {
  metadata: {
    generatedAt: "2026-11-13T10:00:00.000Z",
    schemaVersion: "1.0.0",
    isAnonymized: true,
    currency: "GBP",
  },
  baseline: { userId: "anonymous-user", annualGrossSalary: 42000 },
  observations: [],
  portfolio: {
    netWorth: 4000,
    totalAssets: 4000,
    homeEstimate: 0,
    totalLiabilities: 0,
    totalLiquidCash: 4000,
    totalInvestments: 0,
    totalPensions: 0,
    totalConsumerDebt: 0,
    totalMortgageBalance: 0,
    weightedSavingsRate: 0,
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
        history: [],
      },
    ],
  },
  debtSummary: {
    consumerDebts: [],
    totalStartingDebtGbp: 0,
    avalancheVsSnowballComparison: {},
    promoCliffAlerts: [],
  },
  budgetSummary: {
    monthlyIncome: null,
    essentialBillsMonthly: null,
    discretionarySpendMonthly: null,
    plannedSavingsMonthly: null,
    monthlySurplus: null,
    safeToSpend: null,
    emergencyRunwayMonths: null,
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
  taxSummary: { currentTaxYear: "2026/27", ukTaxCalculation: {} },
};
const okPack = { pack, markdown: "# FLUMP" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("runStdio", () => {
  it("rejects a missing FLUMP_PAT without calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(runStdio({}, fetchImpl as unknown as typeof fetch)).rejects.toThrow(
      PatRejectedError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(PAT_REJECTED_MESSAGE).toBe(
      "Personal access token rejected. Create a new one in Flump under AI connections.",
    );
  });

  for (const status of [401, 403, 404, 500]) {
    it(`rejects a ${status} response and connects nothing`, async () => {
      const fetchImpl = vi.fn(async () => json({}, status));
      const connect = vi.fn();
      await expect(
        runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
      ).rejects.toThrow(PatRejectedError);
      expect(connect).not.toHaveBeenCalled();
    });
  }

  it("rejects when the API is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/Could not reach Flump API at/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("sends the PAT as a bearer token and connects on 2xx", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => json(okPack));
    const connect = vi.fn();
    await runStdio(
      { FLUMP_PAT: PAT, FLUMP_API_URL: "https://api.example.test" },
      fetchImpl as unknown as typeof fetch,
      connect,
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/mcp-tokens/context-pack",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${PAT}` }),
      }),
    );
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("rejects on timeout, passes an abort signal and never connects", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException("The operation timed out", "TimeoutError");
    });
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/Could not reach Flump API/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a 200 response with a non-JSON body", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>oops</html>", { status: 200 }));
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/does not match the contract/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a 200 whose body is not a ContextPackResponse (the old hand-made shape)", async () => {
    const fetchImpl = vi.fn(async () =>
      json({ baseline: { userId: "user-1" }, portfolio: { accounts: [] } }),
    );
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(/does not match the contract/);
    expect(connect).not.toHaveBeenCalled();
  });

  it("rejects a pack with no baseline.userId", async () => {
    const fetchImpl = vi.fn(async () => json({ ...okPack, pack: { ...pack, baseline: {} } }));
    const connect = vi.fn();
    await expect(
      runStdio({ FLUMP_PAT: PAT }, fetchImpl as unknown as typeof fetch, connect),
    ).rejects.toThrow(PatRejectedError);
    expect(connect).not.toHaveBeenCalled();
  });

  it("maps the parsed pack onto the provider input", () => {
    expect(ContextPackResponse.safeParse(okPack).success).toBe(true);
    const input = packToInput(ContextPackResponse.parse(okPack).pack);
    expect(input.baseline.userId).toBe("anonymous-user");
    expect(input.accounts).toEqual([
      {
        id: "6f1c6a4e-5b0e-4a63-9d0a-3f2f2a9d1c11",
        name: "Current Account #1",
        type: "Current",
        balance: 4000,
        interestRate: null,
        monthlyContribution: null,
        currency: "GBP",
      },
    ]);
    expect(input.budgetEntries).toHaveLength(1);
  });

  it("never includes the PAT in thrown errors", async () => {
    const failures: Array<typeof fetch> = [
      (async () => {
        throw new Error(`boom ${PAT}`);
      }) as unknown as typeof fetch,
      (async () => json({}, 401)) as unknown as typeof fetch,
      (async () => new Response("nope", { status: 200 })) as unknown as typeof fetch,
      (async () => json({ baseline: {} })) as unknown as typeof fetch,
    ];
    for (const fetchImpl of failures) {
      const err = await runStdio({ FLUMP_PAT: PAT }, fetchImpl, vi.fn()).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(String(err.message)).not.toContain(PAT);
    }
  });
});
