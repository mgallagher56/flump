// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the loader needs the real exports.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const backendFetch = vi.fn();
const loadWorkspaceSnapshot = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
  loadWorkspaceSnapshot: (...a: unknown[]) => loadWorkspaceSnapshot(...a),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "tok" }),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));
vi.mock("~/features/retirement/components/RetirementPlanner", () => ({
  RetirementPlanner: () => null,
}));

import { BackendError } from "~/services/backend-error";
import { retirementPlanFixture } from "~/test/fixtures/contractResponses";
import { action, loader } from "./app.retirement";

const loaderArgs = () =>
  ({ request: new Request("http://localhost/app/retirement"), params: {}, context: {} }) as never;
const actionArgs = () => {
  const body = new FormData();
  body.set("payload", JSON.stringify({ retirementAge: 60 }));
  return {
    request: new Request("http://localhost/app/retirement", { method: "POST", body }),
    params: {},
    context: {},
  } as never;
};

async function caught(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error("expected rejection");
}

const notFound = () => new BackendError("not-found", "/retirement-plan", 404);

describe("app.retirement (open to everyone the beta lets in; owner, 20 Nov 2026)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadWorkspaceSnapshot.mockResolvedValue({
      userProfile: null,
      accounts: [],
      accountDetails: [],
      budgetEntries: [],
    });
  });

  it("loads the plan for any signed-in, allowed account", async () => {
    backendFetch.mockResolvedValue({ plan: retirementPlanFixture });
    const result = (await loader(loaderArgs())) as { retirementPlan: unknown };
    expect(result.retirementPlan).toEqual(retirementPlanFixture);
  });

  it("loader: asks for budget lines so 'From budget lines' can use them (PP-6)", async () => {
    const food = { id: "b1", name: "Food", category: "food", amount: 400, frequency: "monthly" };
    // Like the real loader: budget rows come back only when asked for.
    loadWorkspaceSnapshot.mockImplementation(
      async (_args: unknown, options?: { includeBudget?: boolean }) => ({
        userProfile: null,
        accounts: [],
        accountDetails: [],
        budgetEntries: options?.includeBudget ? [food] : [],
      }),
    );
    backendFetch.mockResolvedValue({ plan: retirementPlanFixture });
    const result = (await loader(loaderArgs())) as { budgetEntries: unknown[] };
    expect(loadWorkspaceSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ includeBudget: true }),
    );
    expect(result.budgetEntries).toEqual([food]);
  });

  it("loader: a backend failure, a 404 included, is the shared route error (no special not-found)", async () => {
    backendFetch.mockRejectedValue(notFound());
    expect(await caught(loader(loaderArgs()))).toMatchObject({
      init: { status: 404 },
      data: { kind: "not-found", endpoint: "/retirement-plan" },
    });
    backendFetch.mockRejectedValue(new BackendError("server", "/retirement-plan", 500));
    expect(await caught(loader(loaderArgs()))).toMatchObject({ init: { status: 502 } });
  });

  it("action: a backend 404 is an ordinary failed save, not a not-found page", async () => {
    backendFetch.mockRejectedValue(notFound());
    const result = (await action(actionArgs())) as { data: { success: boolean } };
    expect(result.data.success).toBe(false);
  });
});
