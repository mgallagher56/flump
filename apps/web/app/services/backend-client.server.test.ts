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
    const snapshot = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any);

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
    const snapshot = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any, {
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

  it("rejects with a 503 route error when the backend is unreachable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));
    const err = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any, {
      includeBudget: true,
      includeTax: true,
    }).catch((e) => e);
    expect(err.init.status).toBe(503);
    expect(err.data.kind).toBe("unavailable");
  });

  it("rejects with status 401 when /accounts is unauthorised", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url.includes("/accounts")
            ? new Response("no", { status: 401 })
            : new Response("[]", { status: 200 }),
        ),
      );
    const err = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any).catch(
      (e) => e,
    );
    expect(err.init.status).toBe(401);
    expect(err.data.kind).toBe("unauthorised");
  });

  it("rejects with 502 when /tax-records fails and tax was requested", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url.includes("/tax-records")
            ? new Response("boom", { status: 500 })
            : new Response("[]", { status: 200 }),
        ),
      );
    const err = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any, {
      includeTax: true,
    }).catch((e) => e);
    expect(err.init.status).toBe(502);
    expect(err.data.endpoint).toBe("/tax-records");
  });

  it("treats an empty account-details array as valid and falls back to nested details", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url.includes("/accounts")
          ? new Response(JSON.stringify([{ id: "a", details: [{ year: 2026 }] }]), {
              status: 200,
            })
          : new Response("[]", { status: 200 }),
      ),
    );
    const snapshot = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any);
    expect(snapshot.accountDetails).toEqual([{ year: 2026 }]);
  });

  it("does not fall back to nested details when /account-details fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url.includes("/account-details")
          ? new Response("boom", { status: 500 })
          : new Response(JSON.stringify([{ id: "a", details: [{ year: 2026 }] }]), {
              status: 200,
            }),
      ),
    );
    const err = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any).catch(
      (e) => e,
    );
    expect(err.init.status).toBe(502);
  });

  it("returns the empty snapshot without fetching when there is no user", async () => {
    const { getAuthSession } = await import("~/utils/auth.server");
    vi.mocked(getAuthSession).mockResolvedValueOnce({ user: null, accessToken: undefined } as any);
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const snapshot = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any, {
      ensureSignedIn: false,
    });
    expect(snapshot.user).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
