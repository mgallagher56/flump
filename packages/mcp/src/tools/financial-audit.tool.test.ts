import { afterEach, describe, expect, it } from "vitest";
import {
  connectTestClient,
  omitAssumptions,
  TEST_TOKEN,
  type TestHarness,
} from "../testing/client.js";
import { emptyUser, renterWithUnknownAprCard } from "../testing/personas.js";

describe("financial audit tools (E17-N1)", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("evaluate_cashflow_runway_and_health returns score, stage and cash flow", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const body = (await h.callJson("evaluate_cashflow_runway_and_health", {})) as Record<
      string,
      unknown
    >;
    expect(body).toHaveProperty("healthScore.score");
    expect(body).toHaveProperty("financialStage.stage");
    expect(body).toHaveProperty("cashFlow.monthlyDebtMinimumsGbp");
  });

  it("KNOWN LEAK: with no take-home figure, income is assumed to be 72% of gross / 12", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const omitted = await h.callJson("evaluate_cashflow_runway_and_health", {});
    const explicit = await h.callJson("evaluate_cashflow_runway_and_health", {
      hypotheticalMonthlyIncomeGbp: (38000 / 12) * 0.72,
    });
    expect(omitAssumptions(omitted)).toEqual(omitAssumptions(explicit));
  });

  it("KNOWN LEAK: with no savings figure, the emergency fund is assumed to be 5,000", async () => {
    h = await connectTestClient(emptyUser);
    const omitted = await h.callJson("evaluate_cashflow_runway_and_health", {});
    const explicit = await h.callJson("evaluate_cashflow_runway_and_health", {
      hypotheticalLiquidEmergencyFundGbp: 5000,
    });
    expect(omitAssumptions(omitted)).toEqual(omitAssumptions(explicit));
  });

  it("evaluate_uk_student_loan evaluates the given plan and balance", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const body = await h.callJson("evaluate_uk_student_loan", {
      plan: "PLAN_5",
      currentBalanceGbp: 40000,
    });
    expect(body).toMatchObject({ plan: "plan5", threshold: 25000 });
  });

  describe("query_transactions_and_spending", () => {
    const transactions = [
      {
        id: "t1",
        accountId: "cur_1",
        amount: -12.5,
        description: "Monzo coffee",
        category: "eating_out",
        timestamp: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "t2",
        accountId: "cur_1",
        amount: -30,
        description: "Barclays transfer fee",
        category: "eating_out",
        timestamp: "2026-01-03T00:00:00.000Z",
      },
    ];

    it("anonymises institution names and rolls up categories when the token asks for it", async () => {
      h = await connectTestClient(renterWithUnknownAprCard, { transactions });
      const body = (await h.callJson("query_transactions_and_spending", {})) as {
        returnedCount: number;
        categoryVelocitySummary: Record<string, { totalSpendGbp: number }>;
        transactions: Array<{ description: string }>;
      };
      expect(body.returnedCount).toBe(2);
      expect(body.categoryVelocitySummary.eating_out?.totalSpendGbp).toBe(42.5);
      const text = JSON.stringify(body.transactions);
      expect(text).not.toMatch(/monzo|barclays/i);
      expect(text).toContain("Bank");
    });

    it("leaves descriptions intact when the token does not anonymise", async () => {
      h = await connectTestClient(renterWithUnknownAprCard, {
        transactions,
        token: {
          userId: "user_test",
          scopes: ["mcp:read:full", "mcp:simulate"],
          anonymizeInstitutions: false,
          type: "pat",
        },
      });
      const body = (await h.callJson("query_transactions_and_spending", {})) as {
        transactions: Array<{ description: string }>;
      };
      expect(JSON.stringify(body.transactions)).toContain("Monzo coffee");
    });

    it("says so when the provider has no transaction support", async () => {
      h = await connectTestClient(renterWithUnknownAprCard, { withoutTransactions: true });
      const body = (await h.callJson("query_transactions_and_spending", {})) as {
        message: string;
        transactions: unknown[];
      };
      expect(body.message).toContain("not available");
      expect(body.transactions).toEqual([]);
    });
  });
});

describe("query_transactions_and_spending anonymisation (E17-N4)", () => {
  const transactions = [
    {
      id: "t1",
      accountId: "cur_1",
      amount: -3.5,
      description: "Monzo coffee 12-34-56 ref 12345678",
      category: "eating_out",
      timestamp: "2026-01-01T00:00:00Z",
    },
  ];

  it("scrubs institutions and account numbers when anonymised", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard, { transactions });
    const body = (await h.callJson("query_transactions_and_spending", {})) as {
      transactions: Array<{ description: string }>;
    };
    await h.close();
    expect(body.transactions[0]?.description).toBe("Bank coffee [redacted] ref [redacted]");
  });

  it("returns the original text when not anonymised", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard, {
      transactions,
      token: { ...TEST_TOKEN, anonymizeInstitutions: false },
    });
    const body = (await h.callJson("query_transactions_and_spending", {})) as {
      transactions: Array<{ description: string }>;
    };
    await h.close();
    expect(body.transactions[0]?.description).toBe(transactions[0]?.description);
  });
});
