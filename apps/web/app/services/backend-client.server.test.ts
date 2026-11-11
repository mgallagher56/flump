import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadWorkspaceSnapshot } from "./backend-client.server";

vi.mock("~/utils/auth.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/utils/auth.server")>()),
  getAuthSession: vi.fn().mockResolvedValue({
    user: { id: "user_test", email: "test@flump.co.uk" },
    accessToken: "test_token_123",
  }),
}));

describe("backend-client.server", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/accounts")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "acc_1", balance: 500 }]), { status: 200 }),
        );
      }
      if (url.includes("/account-details")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ month: 11, year: 2026, value: 500 }]), { status: 200 }),
        );
      }
      if (url.includes("/user-profile")) {
        return Promise.resolve(
          new Response(JSON.stringify({ annualIncome: 65000 }), { status: 200 }),
        );
      }
      if (url.includes("/budget")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "b_1", amount: 100 }]), { status: 200 }),
        );
      }
      if (url.includes("/tax-records")) {
        return Promise.resolve(
          new Response(JSON.stringify([{ year: "2026/27" }]), { status: 200 }),
        );
      }
      if (url.includes("/bank-connections")) {
        return Promise.resolve(new Response(JSON.stringify([{ id: "conn_1" }]), { status: 200 }));
      }
      if (url.includes("/portfolio-snapshot")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              netWorth: 15000,
              totalAssets: 20000,
              totalLiabilities: 5000,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response("Not found", { status: 404 }));
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("loads standard workspace snapshot with accounts, details, and profile", async () => {
    const snapshot = await loadWorkspaceSnapshot({} as any);

    expect(snapshot.user.id).toBe("user_test");
    expect(snapshot.accounts.length).toBe(1);
    expect(snapshot.accountDetails.length).toBe(1);
    expect(snapshot.userProfile?.annualIncome).toBe(65000);
    // Optional endpoints default to empty when not requested
    expect(snapshot.budgetEntries).toEqual([]);
    expect(snapshot.taxRecords).toEqual([]);
    expect(snapshot.bankConnections).toEqual([]);
  });

  it("fetches budget and tax records when requested in options", async () => {
    const snapshot = await loadWorkspaceSnapshot({} as any, {
      includeBudget: true,
      includeTax: true,
      includeConnections: true,
      includePortfolioSnapshot: true,
    });

    expect(snapshot.budgetEntries.length).toBe(1);
    expect(snapshot.taxRecords.length).toBe(1);
    expect(snapshot.bankConnections.length).toBe(1);
    expect(snapshot.portfolioSnapshot).toBeDefined();
    expect(snapshot.portfolioSnapshot?.netWorth).toBe(15000);
  });

  it("falls back gracefully when backend fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const snapshot = await loadWorkspaceSnapshot({} as any, {
      includeBudget: true,
      includeTax: true,
    });

    expect(snapshot.accounts).toEqual([]);
    expect(snapshot.accountDetails).toEqual([]);
    expect(snapshot.userProfile).toBeNull();
    expect(snapshot.budgetEntries).toEqual([]);
    expect(snapshot.taxRecords).toEqual([]);
  });
});
