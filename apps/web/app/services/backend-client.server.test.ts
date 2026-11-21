// @vitest-environment node
import { UserProfileResponse } from "@flump/api-contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runWithRequestId } from "~/security/request-id.server";
import {
  accountDetailFixture,
  accountWithDetailsFixture,
  bankConnectionFixture,
  budgetEntryFixture,
  jsonResponse,
  profileFixture,
  taxRecordFixture,
} from "~/test/fixtures/contractResponses";
import {
  backendFetch,
  backendFetchBytes,
  loadWorkspacePicture,
  loadWorkspaceSnapshot,
} from "./backend-client.server";
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
    });

    expect(snapshot.budgetEntries.length).toBe(1);
    expect(snapshot.taxRecords.length).toBe(1);
    expect(snapshot.bankConnections.length).toBe(1);
  });

  describe("loadWorkspacePicture", () => {
    const calls = () => vi.mocked(globalThis.fetch).mock.calls.map(([url]) => String(url));
    const count = (path: string) => calls().filter((u) => u.includes(`/v1${path}`)).length;

    it("reads each table once, returns the rows and builds the picture from them", async () => {
      const result = await loadWorkspacePicture({ request: new Request("http://x/") } as any);

      expect(count("/accounts")).toBe(1);
      expect(count("/user-profile")).toBe(1);
      expect(count("/budget-entries")).toBe(1);
      expect(count("/tax-records")).toBe(1);
      expect(count("/bank-connections")).toBe(0);
      expect(count("/account-details")).toBe(0);
      // The contract fills defaults (ownership, sharePercent), so compare the fixture fields.
      expect(result.accounts).toMatchObject([accountWithDetailsFixture]);
      expect(result.accountDetails).toMatchObject([accountDetailFixture]);
      expect(result.userProfile).toMatchObject(profileFixture);
      expect(result.budgetEntries).toMatchObject([budgetEntryFixture]);
      expect(result.taxRecords).toMatchObject([taxRecordFixture]);
      expect(result.bankConnections).toEqual([]);
      expect(result.picture).not.toBeNull();
      // One Current account with balance 1234.56 and no debts, so net worth = 1234.56 - 0. The
      // account's own balance is the saved figure; the monthly row (1100.10) feeds history only.
      expect(result.picture?.netWorth.netWorth).toBeCloseTo(1234.56, 2);
    });

    it("reads bank connections only when asked", async () => {
      const result = await loadWorkspacePicture({ request: new Request("http://x/") } as any, {
        includeConnections: true,
      });
      expect(count("/bank-connections")).toBe(1);
      expect(result.bankConnections).toMatchObject([bankConnectionFixture]);
    });

    it("returns no picture and makes no request when nobody is signed in", async () => {
      const { getAuthSession } = await import("~/utils/auth.server");
      vi.mocked(getAuthSession).mockResolvedValueOnce({
        user: null,
        accessToken: undefined,
      } as any);
      const result = await loadWorkspacePicture({ request: new Request("http://x/") } as any, {
        ensureSignedIn: false,
      });
      expect(result.picture).toBeNull();
      expect(result.user).toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  it("reads the latest completed check-in month only when asked (CH-3)", async () => {
    const base = globalThis.fetch as ReturnType<typeof vi.fn>;
    const inner = base.getMockImplementation() as (url: string) => Promise<Response>;
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string) =>
        url.includes("/v1/snapshots/check-ins")
          ? Promise.resolve(jsonResponse({ latestCompletedMonth: "2026-10" }))
          : inner(url),
      );
    const args = { request: new Request("http://x/") } as any;
    expect((await loadWorkspaceSnapshot(args, { includeCheckIns: true })).latestCheckInMonth).toBe(
      "2026-10",
    );
    const plain = await loadWorkspaceSnapshot(args);
    expect(plain).not.toHaveProperty("latestCheckInMonth");
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.filter(([url]) => String(url).includes("check-ins"))).toHaveLength(1);
  });

  it("leaves the check-in month unknown, and the page loading, when that call fails", async () => {
    const inner = (globalThis.fetch as ReturnType<typeof vi.fn>).getMockImplementation() as (
      url: string,
    ) => Promise<Response>;
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string) =>
        url.includes("/v1/snapshots/check-ins")
          ? Promise.resolve(new Response("boom", { status: 500 }))
          : inner(url),
      );
    const snapshot = await loadWorkspaceSnapshot({ request: new Request("http://x/") } as any, {
      includeCheckIns: true,
    });
    expect(snapshot.accounts.length).toBe(1);
    expect(snapshot.latestCheckInMonth).toBeUndefined();
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

  describe("sessions and empty answers", () => {
    const args = () => ({ request: new Request("http://x/") }) as any;
    const auth = async () => vi.mocked((await import("~/utils/auth.server")).getAuthSession);
    const emptyRows = {
      accounts: [],
      accountDetails: [],
      userProfile: null,
      budgetEntries: [],
      taxRecords: [],
      bankConnections: [],
    };

    it("asks for a signed-in session unless told otherwise", async () => {
      const getAuthSession = await auth();
      getAuthSession.mockClear();
      const a = args();
      await loadWorkspaceSnapshot(a);
      expect(getAuthSession).toHaveBeenLastCalledWith(a, { ensureSignedIn: true });
      const b = args();
      await loadWorkspacePicture(b);
      expect(getAuthSession).toHaveBeenLastCalledWith(b, { ensureSignedIn: true });
    });

    it("returns empty lists and no profile when nobody is signed in", async () => {
      const getAuthSession = await auth();
      getAuthSession.mockResolvedValueOnce({ user: null, accessToken: undefined } as any);
      expect(await loadWorkspaceSnapshot(args(), { ensureSignedIn: false })).toEqual({
        user: null,
        accessToken: undefined,
        ...emptyRows,
      });
      getAuthSession.mockResolvedValueOnce({ user: null, accessToken: undefined } as any);
      expect(await loadWorkspacePicture(args(), { ensureSignedIn: false })).toEqual({
        user: null,
        accessToken: undefined,
        ...emptyRows,
        picture: null,
      });
    });

    it("refuses a signed-in user with no access token as unauthorised, calling nothing", async () => {
      const getAuthSession = await auth();
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;
      for (const load of [loadWorkspaceSnapshot, loadWorkspacePicture]) {
        getAuthSession.mockResolvedValueOnce({ user: { id: "user_test" }, accessToken: "" } as any);
        const err = await load(args()).catch((e) => e);
        expect(err.init.status).toBe(401);
        expect(err.data.kind).toBe("unauthorised");
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("loadWorkspacePicture rows and options", () => {
    const args = () => ({ request: new Request("http://x/") }) as any;

    it("keeps a tax record's notes and receipt details", async () => {
      const record = {
        ...taxRecordFixture,
        notes: "Letting agent statement",
        receiptFilename: "statement.pdf",
        receiptMimeType: "application/pdf",
        hasReceipt: true,
      };
      const inner = vi.mocked(globalThis.fetch).getMockImplementation() as (
        url: string,
      ) => Promise<Response>;
      globalThis.fetch = vi
        .fn()
        .mockImplementation((url: string) =>
          url.includes("/v1/tax-records") ? Promise.resolve(jsonResponse([record])) : inner(url),
        );
      const result = await loadWorkspacePicture(args());
      expect(result.taxRecords[0]).toMatchObject({
        notes: "Letting agent statement",
        receiptFilename: "statement.pdf",
        receiptMimeType: "application/pdf",
      });
    });

    it("reads the check-in month only when asked", async () => {
      const inner = vi.mocked(globalThis.fetch).getMockImplementation() as (
        url: string,
      ) => Promise<Response>;
      globalThis.fetch = vi
        .fn()
        .mockImplementation((url: string) =>
          url.includes("/v1/snapshots/check-ins")
            ? Promise.resolve(jsonResponse({ latestCompletedMonth: "2026-10" }))
            : inner(url),
        );
      const plain = await loadWorkspacePicture(args());
      expect(plain).not.toHaveProperty("latestCheckInMonth");
      const urls = () => vi.mocked(globalThis.fetch).mock.calls.map(([url]) => String(url));
      expect(urls().some((u) => u.includes("check-ins"))).toBe(false);
      const asked = await loadWorkspacePicture(args(), { includeCheckIns: true });
      expect(asked.latestCheckInMonth).toBe("2026-10");
    });

    it("turns a failed read into a route error", async () => {
      globalThis.fetch = vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            url.includes("/v1/budget-entries")
              ? new Response("boom", { status: 500 })
              : url.includes("/v1/user-profile")
                ? jsonResponse(profileFixture)
                : jsonResponse([]),
          ),
        );
      const err = await loadWorkspacePicture(args()).catch((e) => e);
      expect(err.init.status).toBe(502);
      expect(err.data.endpoint).toBe("/budget-entries");
    });
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
