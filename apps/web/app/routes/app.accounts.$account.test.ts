import { beforeEach, describe, expect, it, vi } from "vitest";

const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "token" }),
}));

const { loader } = await import("./app.accounts.$account");

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

  it("leaves the basis unknown (null) when the profile cannot be read", async () => {
    respond(new Error("profile down"));
    const data = await run();
    expect(data.basis).toBeNull();
    expect(data.account).toBe(account);
  });
});
