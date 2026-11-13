import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { estimateTokens } from "../../envelope.js";
import { resolveShortId, shortId } from "../../short-ids.js";
import { connectTestClient, detectDefaultLeaks, type TestHarness } from "../../testing/client.js";
import {
  emptyUser,
  mixedAccountsWithHistory,
  renterWithUnknownAprCard,
} from "../../testing/personas.js";
import { READ_TOOLS } from "./index.js";

const NAMES = [
  "get_financial_snapshot",
  "get_net_worth_history",
  "list_accounts",
  "get_budget_summary",
  "get_debt_overview",
];

type Env = {
  schemaVersion: string;
  result: Record<string, any>;
  missing: Array<{ field: string; askUser: string }>;
  assumptions: unknown[];
  truncated: boolean;
};

const call = async (h: TestHarness, name: string, args: Record<string, unknown> = {}) =>
  (await h.callJson(name, args)) as Env;

describe("read tools v2: registration", () => {
  it("registers the five tools in a fixed order", () => {
    expect(READ_TOOLS.map((t) => t.name)).toEqual(NAMES);
  });
});

describe("read tools v2: mixed persona golden outputs", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(mixedAccountsWithHistory);
  });
  afterAll(async () => h.close());

  it("get_financial_snapshot", async () => {
    const e = await call(h, "get_financial_snapshot");
    expect(e.schemaVersion).toBe("2.0");
    expect(e.result).toEqual({
      netWorthGbp: 1100,
      assetsGbp: 10100,
      liabilitiesGbp: 9000,
      liquidCashGbp: 10100,
      investmentsGbp: 0,
      pensionsGbp: 0,
      propertyGbp: 0,
      consumerDebtGbp: 9000,
      mortgageGbp: 0,
      studentLoanGbp: 0,
      accountCount: 4,
      debtCount: 2,
      monthlyIncomeGbp: 3200,
      monthlyEssentialSpendGbp: 1120,
      monthlySurplusGbp: 3200 - 1120 - 216.67 - 200 - 75,
      emergencyRunwayMonths: 9,
    });
    expect(e.assumptions).toEqual([]);
  });

  it("get_net_worth_history", async () => {
    const e = await call(h, "get_net_worth_history", { months: 3 });
    expect(e.result.points.map((p: { month: string }) => p.month)).toEqual([
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(e.result.monthsCovered).toBe(3);
    expect(e.result.changeGbp).toBe(
      e.result.points[2].netWorthGbp - e.result.points[0].netWorthGbp,
    );
    const detailed = await call(h, "get_net_worth_history", {
      months: 3,
      responseFormat: "detailed",
    });
    expect(detailed.result.points[0]).toHaveProperty("assetsGbp");
  });

  it("list_accounts uses short ids and generic labels, with a filter", async () => {
    const e = await call(h, "list_accounts");
    expect(e.result.total).toBe(4);
    expect(e.result.accounts.map((a: { label: string }) => a.label)).toEqual([
      "Current Account #1",
      "Saving Account #1",
      "Credit Card Account #1",
      "Loan Account #1",
    ]);
    const debts = await call(h, "list_accounts", { category: "debt" });
    expect(debts.result.accounts).toHaveLength(2);
    expect(debts.missing.map((m) => m.field)).toEqual([
      `accounts.${debts.result.accounts[0].id}.interestRatePct`,
    ]);
  });

  it("get_budget_summary converts frequencies and scrubs names", async () => {
    const e = await call(h, "get_budget_summary", { responseFormat: "detailed" });
    expect(e.result.monthlyIncomeGbp).toBe(3200);
    expect(e.result.essentialMonthlyGbp).toBe(1120);
    expect(e.result.discretionaryMonthlyGbp).toBe(216.67);
    expect(e.result.monthlySurplusGbp).toBe(1863.33);
    const text = JSON.stringify(e);
    expect(text).not.toMatch(/Acme|Barclays|secret note/);
    expect(e.result.entries[0].name).toBe("Income #1");
  });

  it("get_debt_overview flags the unknown APR and never guesses it", async () => {
    const e = await call(h, "get_debt_overview");
    const card = e.result.debts.find((d: { type: string }) => d.type === "credit_card");
    expect(card).toMatchObject({
      aprPct: null,
      aprStatus: "unknown",
      minimumPaymentStatus: "estimated",
    });
    const loan = e.result.debts.find((d: { type: string }) => d.type === "loan");
    expect(loan).toMatchObject({ aprPct: 7.9, aprStatus: "known", minimumPaymentGbp: 200 });
    expect(e.result.weightedAprPct).toBe(7.9);
    expect(e.missing).toHaveLength(1);
    expect(e.missing[0]?.askUser).toMatch(/APR/);
  });

  it("never exposes institution names or raw UUIDs", async () => {
    let all = "";
    for (const name of NAMES) all += await h.callText(name, { responseFormat: "detailed" });
    expect(all).not.toMatch(/Monzo|Barclays|Amex|Santander|aaaa-4aaa/);
  });
});

describe("read tools v2: full-access token sees real names", () => {
  it("returns account names when anonymisation is off and the token has full read", async () => {
    const h = await connectTestClient(mixedAccountsWithHistory, {
      token: {
        userId: "u",
        tokenId: "tok_1",
        scopes: ["mcp:read:full"],
        anonymizeInstitutions: false,
        type: "pat",
      },
    });
    try {
      const e = await call(h, "list_accounts");
      expect(e.result.accounts[0].label).toBe("Monzo Current");
    } finally {
      await h.close();
    }
  });
});

describe("read tools v2: empty user", () => {
  it("asks rather than guessing, and leaks no defaults", async () => {
    const h = await connectTestClient(emptyUser);
    try {
      for (const name of NAMES) {
        const e = await call(h, name);
        expect(e.missing.length, name).toBeGreaterThan(0);
        expect(e.missing.every((m) => m.askUser.length > 0)).toBe(true);
        expect(detectDefaultLeaks(e.result), name).toEqual([]);
      }
      const snap = await call(h, "get_financial_snapshot");
      expect(snap.result.monthlyIncomeGbp).toBeNull();
      expect(snap.result.monthlySurplusGbp).toBeNull();
      expect(snap.result.netWorthGbp).toBe(0);
    } finally {
      await h.close();
    }
  });
});

describe("read tools v2: size and scopes", () => {
  it("concise output stays within 1,500 tokens", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard);
    try {
      for (const name of NAMES) {
        expect(estimateTokens(await h.callText(name)), name).toBeLessThanOrEqual(1500);
      }
    } finally {
      await h.close();
    }
  });

  it("returns INSUFFICIENT_SCOPE without a read scope", async () => {
    const h = await connectTestClient(emptyUser, {
      token: { userId: "u", scopes: ["mcp:simulate"], anonymizeInstitutions: true, type: "pat" },
    });
    try {
      for (const name of NAMES) {
        const res = await h.client.callTool({ name, arguments: {} });
        expect(res.isError, name).toBe(true);
        expect(JSON.stringify(res.content)).toMatch(/INSUFFICIENT_SCOPE/);
      }
    } finally {
      await h.close();
    }
  });
});

describe("short ids", () => {
  const uuid = "11111111-aaaa-4aaa-8aaa-000000000001";
  it("is stable per token, differs between tokens and kinds, and reveals no uuid", () => {
    expect(shortId("tok_1", "acc", uuid)).toBe(shortId("tok_1", "acc", uuid));
    expect(shortId("tok_1", "acc", uuid)).not.toBe(shortId("tok_2", "acc", uuid));
    expect(shortId("tok_1", "acc", uuid)).not.toBe(shortId("tok_1", "debt", uuid));
    expect(shortId("tok_1", "acc", uuid)).toMatch(/^acc_[0-9a-f]{10}$/);
  });
  it("resolves only among the caller's own records", () => {
    const records = [{ id: uuid }, { id: "other" }];
    const id = shortId("tok_1", "acc", uuid);
    expect(resolveShortId("tok_1", "acc", records, id)).toBe(records[0]);
    expect(resolveShortId("tok_2", "acc", records, id)).toBeUndefined();
    expect(resolveShortId("tok_1", "acc", [], id)).toBeUndefined();
  });
});
