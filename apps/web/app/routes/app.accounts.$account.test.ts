import { beforeEach, describe, expect, it, vi } from "vitest";

const backendFetch = vi.fn();
const backendFetchAll = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
  backendFetchAll: (...a: unknown[]) => backendFetchAll(...a),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "token" }),
  requireAccessToken: ({ accessToken }: { accessToken: string }) => accessToken,
}));

const { action, loader } = await import("./app.accounts.$account");
const { BackendError } = await import("~/services/backend-error");

const args = {
  request: new Request("http://app.test/app/accounts/a1"),
  params: { account: "a1" },
} as never;
const account = { id: "a1", name: "Plan 2", type: "Student Loan", balance: -25000, details: [] };

async function run() {
  const res = (await loader(args)) as unknown as { data: Record<string, unknown> };
  return res.data;
}

/** Answers the account and the profile; `profile` is a value or an Error to reject with. */
const respond = (profile: unknown) =>
  backendFetch.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/user-profile") {
      if (profile instanceof Error) throw profile;
      return profile;
    }
    return account;
  });

describe("app.accounts.$account loader", () => {
  beforeEach(() => backendFetch.mockReset());

  it("passes the user's net worth choices", async () => {
    respond({ netWorthCountsProperty: false, netWorthCountsStudentLoan: true });
    expect((await run()).basis).toEqual({ countProperty: false, countStudentLoan: true });
  });

  it.each([
    ["client", 400],
    ["not-found", 404],
  ] as const)(
    "shows a missing account as not found when the backend answers %s (%i, P18)",
    async (kind, status) => {
      // The account first, then the profile (the loader asks for both at once).
      backendFetch
        .mockRejectedValueOnce(new BackendError(kind, "/accounts/a1", status))
        .mockResolvedValueOnce({});
      const thrown = await loader(args).then(
        () => null,
        (e: unknown) => e as { init: { status: number }; data: { kind: string } },
      );
      expect(thrown?.init.status).toBe(404);
      expect(thrown?.data.kind).toBe("not-found");
    },
  );

  it.each([429, 409])(
    "passes any other 4xx (%i) through unchanged, not as not found",
    async (status) => {
      backendFetch
        .mockRejectedValueOnce(new BackendError("client", "/accounts/a1", status))
        .mockResolvedValueOnce({});
      const thrown = await loader(args).then(
        () => null,
        (e: unknown) => e as { init: { status: number }; data: { kind: string; endpoint: string } },
      );
      // The kind's own route status (client: 400), not the 404 not-found page.
      expect(thrown?.init.status).toBe(400);
      expect(thrown?.data).toEqual({ kind: "client", endpoint: "/accounts/a1" });
    },
  );

  it("leaves the basis unknown (null) when the profile cannot be read", async () => {
    respond(new Error("profile down"));
    const data = await run();
    expect(data.basis).toBeNull();
    expect(data.account).toBe(account);
  });

  it("reads no accounts list for an account that is not a mortgage", async () => {
    backendFetchAll.mockReset();
    respond({});
    expect((await run()).accounts).toEqual([]);
    expect(backendFetchAll).not.toHaveBeenCalled();
  });

  it("lists the user's accounts for a mortgage, so its form can offer the property link", async () => {
    const mortgage = { ...account, type: "Mortgage", name: "Mortgage", balance: -200000 };
    const home = { id: "h1", name: "Home", type: "Property", balance: 300000 };
    backendFetch.mockImplementation(async (endpoint: string) =>
      endpoint === "/user-profile" ? {} : mortgage,
    );
    backendFetchAll.mockReset();
    backendFetchAll.mockResolvedValue([mortgage, home]);
    expect((await run()).accounts).toEqual([mortgage, home]);
  });

  it("leaves the list empty when it cannot be read, and still loads the mortgage", async () => {
    const mortgage = { ...account, type: "Mortgage" };
    backendFetch.mockImplementation(async (endpoint: string) =>
      endpoint === "/user-profile" ? {} : mortgage,
    );
    backendFetchAll.mockReset();
    backendFetchAll.mockRejectedValue(new Error("list down"));
    const data = await run();
    expect(data.accounts).toEqual([]);
    expect(data.account).toBe(mortgage);
  });
});

const post = (fields: Record<string, string>) => {
  // URL-encoded, as useFetcher().submit sends a plain object.
  const body = new URLSearchParams(fields);
  return action({
    request: new Request("http://app.test/app/accounts/a1", { method: "POST", body }),
    params: { account: "a1" },
  } as never);
};

describe("app.accounts.$account action", () => {
  beforeEach(() => {
    backendFetch.mockReset();
    backendFetch.mockResolvedValue({});
  });

  it("updates the account with its joint share, kind, limit and 0% date", async () => {
    const res = (await post({
      intent: "update",
      accountId: "a1",
      name: "Card",
      type: "Credit Card",
      balance: "-250",
      ownership: "joint",
      sharePercent: "40",
      creditLimit: "3000",
      promoZeroPercentUntil: "2027-06-30",
      accountSubtype: "",
    })) as unknown as { data: unknown };
    expect(res.data).toEqual({ success: true });
    expect(backendFetch).toHaveBeenCalledWith(
      "/accounts/a1",
      expect.objectContaining({
        method: "PATCH",
        accessToken: "token",
        body: {
          name: "Card",
          type: "Credit Card",
          balance: -250,
          ownership: "joint",
          sharePercent: 40,
          accountSubtype: null,
          creditLimit: 3000,
          promoZeroPercentUntil: "2027-06-30",
        },
      }),
    );
  });

  it("sends only what the form posted: no name or type when they were not changed", async () => {
    await post({ intent: "update", accountId: "a1", interestRate: "4.2", repaymentType: "" });
    expect(backendFetch).toHaveBeenCalledWith(
      "/accounts/a1",
      expect.objectContaining({ body: { interestRate: 4.2, repaymentType: null } }),
    );
  });

  it("falls back to the route's account id", async () => {
    await post({ intent: "update", name: "Pot", type: "Saving" });
    expect(backendFetch).toHaveBeenCalledWith(
      "/accounts/a1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deletes the account, then sends the user back to the accounts list", async () => {
    const res = (await post({ intent: "delete", accountId: "a1" })) as Response;
    expect(backendFetch).toHaveBeenCalledWith(
      "/accounts/a1",
      expect.objectContaining({ method: "DELETE", accessToken: "token" }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/app/accounts");
  });

  it("refuses an unknown intent with 400 and calls nothing", async () => {
    const res = (await post({ intent: "archive" })) as unknown as {
      data: unknown;
      init: { status: number };
    };
    expect(res.init.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("stays on the page with the error when the delete fails", async () => {
    backendFetch.mockRejectedValue(new BackendError("server", "/accounts/a1", 500));
    const res = (await post({ intent: "delete", accountId: "a1" })) as unknown as {
      data: { success: boolean };
      init: { status: number };
    };
    expect(res).not.toBeInstanceOf(Response);
    expect(res.data.success).toBe(false);
    expect(res.init.status).toBe(500);
  });
});
