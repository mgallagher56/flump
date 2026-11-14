import { UserProfileResponse } from "@flump/api-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runWithRequestId } from "~/security/request-id.server";
import {
  accountDetailFixture,
  accountWithDetailsFixture,
  bankConnectionFixture,
  budgetEntryFixture,
  jsonResponse,
  portfolioSnapshotFixture,
  profileFixture,
  taxRecordFixture,
} from "~/test/fixtures/contractResponses";
import { backendFetch, backendFetchBytes, loadWorkspaceSnapshot } from "./backend-client.server";
import { CLIENT_IP_HEADER, CLIENT_IP_KEY_ENV, CLIENT_IP_SIG_HEADER } from "./client-ip.server";

vi.mock("~/utils/auth.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/utils/auth.server")>()),
  getAuthSession: vi.fn().mockResolvedValue({
    user: { id: "user_test", email: "test@example.com" },
    accessToken: "test_token_123",
  }),
}));

describe("backend-client.server", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/v1/accounts")) {
        return Promise.resolve(jsonResponse([accountWithDetailsFixture]));
      }
      if (url.includes("/v1/user-profile")) return Promise.resolve(jsonResponse(profileFixture));
      if (url.includes("/v1/budget-entries")) {
        return Promise.resolve(jsonResponse([budgetEntryFixture]));
      }
      if (url.includes("/v1/tax-records")) return Promise.resolve(jsonResponse([taxRecordFixture]));
      if (url.includes("/v1/bank-connections")) {
        return Promise.resolve(jsonResponse([bankConnectionFixture]));
      }
      if (url.includes("/v1/portfolio-snapshot")) {
        return Promise.resolve(jsonResponse(portfolioSnapshotFixture));
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
    expect(snapshot.userProfile?.annualSalary).toBe(65000);
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
            : jsonResponse(profileFixture),
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
            : url.includes("/user-profile")
              ? jsonResponse(profileFixture)
              : jsonResponse([]),
        ),
      );
    const err = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any, {
      includeTax: true,
    }).catch((e) => e);
    expect(err.init.status).toBe(502);
    expect(err.data.endpoint).toBe("/tax-records");
  });

  it("takes account details from the accounts' nested details, with no /account-details call (M24)", async () => {
    const snapshot = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any);
    expect(snapshot.accountDetails).toEqual([accountDetailFixture]);
    const urls = vi.mocked(globalThis.fetch).mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.includes("/account-details"))).toBe(false);
  });

  it("follows X-Next-Cursor on list reads", async () => {
    const second = { ...accountWithDetailsFixture, id: "a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d" };
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/v1/accounts?cursor=p2")) return Promise.resolve(jsonResponse([second]));
      if (url.includes("/v1/accounts")) {
        return Promise.resolve(
          jsonResponse([accountWithDetailsFixture], 200, { "X-Next-Cursor": "p2" }),
        );
      }
      return Promise.resolve(jsonResponse(profileFixture));
    });
    const snapshot = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any);
    expect(snapshot.accounts.map((a) => a.id)).toEqual([accountWithDetailsFixture.id, second.id]);
  });

  it("reports a body that breaks the contract as a 502 bad-response", async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url.includes("/v1/accounts")
            ? jsonResponse([{ ...accountWithDetailsFixture, balance: "not a number" }])
            : jsonResponse(profileFixture),
        ),
      );
    const err = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any).catch(
      (e) => e,
    );
    expect(err.init.status).toBe(502);
    expect(err.data.kind).toBe("bad-response");
  });

  it("shares one /user-profile call between loaders of the same request", async () => {
    await runWithRequestId("req-dedupe-1", () =>
      Promise.all([
        loadWorkspaceSnapshot({ request: new Request("http://x/") } as any),
        backendFetch("/user-profile", {
          accessToken: "test_token_123",
          schema: UserProfileResponse,
        }),
      ]),
    );
    const urls = vi.mocked(globalThis.fetch).mock.calls.map(([url]) => String(url));
    expect(urls.filter((u) => u.endsWith("/v1/user-profile"))).toHaveLength(1);

    // A later request, or none, fetches again.
    await backendFetch("/user-profile", {
      accessToken: "test_token_123",
      schema: UserProfileResponse,
    });
    const after = vi.mocked(globalThis.fetch).mock.calls.map(([url]) => String(url));
    expect(after.filter((u) => u.endsWith("/v1/user-profile"))).toHaveLength(2);
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

describe("signed client IP on backend calls (BE-07, M9)", () => {
  // A made-up test key, not a real secret.
  const KEY = "k".repeat(40);
  const originalFetch = globalThis.fetch;
  const saved = process.env[CLIENT_IP_KEY_ENV];
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env[CLIENT_IP_KEY_ENV] = KEY;
    fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    globalThis.fetch = fetchSpy as never;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (saved === undefined) delete process.env[CLIENT_IP_KEY_ENV];
    else process.env[CLIENT_IP_KEY_ENV] = saved;
  });

  const sentHeaders = (i: number) =>
    (fetchSpy.mock.calls[i] as unknown as [string, RequestInit])[1].headers as Record<
      string,
      string
    >;

  it("signs the request context's client address on backendFetch and backendFetchBytes", async () => {
    await runWithRequestId(
      "req-12345678",
      async () => {
        await backendFetch("/accounts", { schema: null, allowEmpty: true, accessToken: "t" });
        await backendFetchBytes("/tax-records/x/receipt", { accessToken: "t" });
      },
      { clientIp: "203.0.113.7" },
    );
    for (const i of [0, 1]) {
      expect(sentHeaders(i)[CLIENT_IP_HEADER]).toBe("203.0.113.7");
      expect(sentHeaders(i)[CLIENT_IP_SIG_HEADER]).toMatch(/^v1=\d+\.[0-9a-f]{64}$/);
      expect(sentHeaders(i)["x-request-id"]).toBe("req-12345678");
    }
  });

  it("sends no client-IP headers outside a request or without a known address", async () => {
    const opts = { schema: null, allowEmpty: true, accessToken: "t" } as const;
    await backendFetch("/accounts", opts);
    await runWithRequestId("req-12345678", () => backendFetch("/accounts", opts));
    for (const i of [0, 1]) expect(sentHeaders(i)[CLIENT_IP_HEADER]).toBeUndefined();
  });
});
