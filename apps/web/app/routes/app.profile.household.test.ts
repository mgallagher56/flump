// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
  backendFetchAll: async () => [],
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "token" }),
}));

import { BackendError } from "~/services/backend-error";
import { action, loader } from "./app.profile";

const PROFILE = { id: "u1", email: "a@example.com" };
const IN_HOUSEHOLD = {
  household: { sharesJointSummary: false, joinedAt: "2026-11-20T09:00:00.000Z", withName: "Sam" },
  invitation: null,
};
const NOT_IN_ONE = { household: null, invitation: null };
const ITEMS = [{ name: "Bills", type: "Current", wholeBalance: 1200, addedBy: "you" }];

/** Answers by endpoint; a value that is an Error is thrown. */
const answer = (byEndpoint: Record<string, unknown>) =>
  backendFetch.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/user-profile") return PROFILE;
    if (endpoint === "/beta/admin") throw new BackendError("not-found", endpoint, 404);
    const value = byEndpoint[endpoint];
    if (value instanceof Error) throw value;
    if (value === undefined) throw new Error(`unexpected ${endpoint}`);
    return value;
  });

const calledEndpoints = () => backendFetch.mock.calls.map((c) => c[0]);

const runLoader = async () => {
  const result = (await loader({
    request: new Request("https://app.example/app/profile"),
    params: {},
    context: {},
  } as never)) as unknown as { data: { household: unknown } };
  return result.data.household;
};

describe("settings loader: the household probe (fail closed)", () => {
  beforeEach(() => {
    backendFetch.mockReset();
  });

  it("with the switch off (404), gives no household data, so no tab, and reads nothing else", async () => {
    answer({ "/household": new BackendError("not-found", "/household", 404) });
    expect(await runLoader()).toBeNull();
    expect(calledEndpoints()).not.toContain("/household/joint-summary");
  });

  it.each([
    ["server", 500],
    ["unavailable", undefined],
    ["forbidden", 403],
  ] as const)("on any other failure (%s), gives no household data either", async (kind, status) => {
    answer({ "/household": new BackendError(kind, "/household", status) });
    expect(await runLoader()).toBeNull();
  });

  it("not in a household, passes the state and reads no summary", async () => {
    answer({ "/household": NOT_IN_ONE });
    expect(await runLoader()).toEqual({ state: NOT_IN_ONE, jointSummary: null });
    expect(calledEndpoints()).not.toContain("/household/joint-summary");
  });

  it("in a household, passes the state and the joint summary", async () => {
    answer({ "/household": IN_HOUSEHOLD, "/household/joint-summary": { items: ITEMS } });
    expect(await runLoader()).toEqual({ state: IN_HOUSEHOLD, jointSummary: ITEMS });
  });

  it("in a household whose summary fails, still has the tab, without the summary", async () => {
    answer({
      "/household": IN_HOUSEHOLD,
      "/household/joint-summary": new BackendError("server", "/household/joint-summary", 500),
    });
    expect(await runLoader()).toEqual({ state: IN_HOUSEHOLD, jointSummary: null });
  });
});

describe("settings loader: the starting tab is chosen on the server", () => {
  beforeEach(() => {
    backendFetch.mockReset();
  });

  const startingTab = async (search: string) => {
    const result = (await loader({
      request: new Request(`https://app.example/app/profile${search}`),
      params: {},
      context: {},
    } as never)) as unknown as { data: { initialTab: string } };
    return result.data.initialTab;
  };

  it.each([
    ["?tab=household", "household"],
    ["?tab=security", "security"],
    ["?tab=data", "data"],
    ["?tab=profile_security", "profile"],
    ["?tab=ai_connections", "security"],
    ["?tab=nope", "profile"],
    ["", "profile"],
  ])("with households on, %s opens %s", async (search, expected) => {
    answer({ "/household": NOT_IN_ONE });
    expect(await startingTab(search)).toBe(expected);
  });

  it("with households off, ?tab=household opens Profile like an unknown tab", async () => {
    answer({ "/household": new BackendError("not-found", "/household", 404) });
    expect(await startingTab("?tab=household")).toBe("profile");
  });
});

const runAction = async (fields: Record<string, string>) => {
  const body = new URLSearchParams(fields);
  const result = (await action({
    request: new Request("https://app.example/app/profile", { method: "POST", body }),
    params: {},
    context: {},
  } as never)) as unknown as {
    data: Record<string, unknown>;
    init?: { status?: number; headers?: Record<string, string> };
  };
  return result;
};

describe("settings action: household intents", () => {
  beforeEach(() => {
    backendFetch.mockReset();
  });

  it("makes a link on this app's address and does not let it be cached", async () => {
    const token = "t".repeat(43);
    backendFetch.mockResolvedValue({ token, expiresAt: "2026-11-27T10:00:00.000Z" });
    const result = await runAction({ intent: "household-create-link" });
    expect(result.data).toEqual({
      intent: "household-create-link",
      link: `https://app.example/household/join/${token}`,
      expiresAt: "2026-11-27T10:00:00.000Z",
    });
    expect(result.init?.headers?.["Cache-Control"]).toBe("no-store");
    expect(backendFetch).toHaveBeenCalledTimes(1);
    const [endpoint, opts] = backendFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(endpoint).toBe("/household/invitations");
    expect(opts.method).toBe("POST");
    expect(opts.body).toEqual({});
  });

  it("cancels the person's own link", async () => {
    backendFetch.mockResolvedValue({ success: true });
    const result = await runAction({ intent: "household-cancel-link" });
    expect(result.data).toEqual({ intent: "household-cancel-link", success: true });
    const [endpoint, opts] = backendFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect([endpoint, opts.method]).toEqual(["/household/invitations", "DELETE"]);
  });

  it("leaves with an empty body", async () => {
    backendFetch.mockResolvedValue({ success: true });
    const result = await runAction({ intent: "household-leave" });
    expect(result.data).toEqual({ intent: "household-leave", success: true });
    const [endpoint, opts] = backendFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect([endpoint, opts.method, opts.body]).toEqual(["/household/leave", "POST", {}]);
  });

  it.each([
    ["true", true],
    ["false", false],
  ])("saves sharing %s as %s", async (sent, expected) => {
    backendFetch.mockResolvedValue({ sharesJointSummary: expected });
    const result = await runAction({ intent: "household-sharing", sharesJointSummary: sent });
    expect(result.data).toEqual({ intent: "household-sharing", sharesJointSummary: expected });
    const [endpoint, opts] = backendFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect([endpoint, opts.body]).toEqual(["/household/sharing", { sharesJointSummary: expected }]);
  });

  it("gives 409 already_in_household its own message", async () => {
    const error = new BackendError("client", "/household/invitations", 409);
    error.code = "already_in_household";
    backendFetch.mockRejectedValue(error);
    const result = await runAction({ intent: "household-create-link" });
    expect(result.init?.status).toBe(409);
    expect(result.data).toEqual({
      success: false,
      error:
        "You are already in a household. To join a different one, leave your current household first.",
    });
  });

  it("a household intent with the switch off gets the ordinary not-found message", async () => {
    backendFetch.mockRejectedValue(new BackendError("not-found", "/household/leave", 404));
    const result = await runAction({ intent: "household-leave" });
    expect(result.init?.status).toBe(404);
    expect(result.data).toEqual({
      success: false,
      error: "We could not find that. It may have been deleted.",
    });
  });
});
