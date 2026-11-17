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

describe("app.retirement friends-beta gate (RD9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadWorkspaceSnapshot.mockResolvedValue({
      userProfile: null,
      accounts: [],
      accountDetails: [],
      budgetEntries: [],
    });
  });

  it("loads the plan for an account that has the feature", async () => {
    backendFetch.mockResolvedValue({ plan: retirementPlanFixture });
    const result = (await loader(loaderArgs())) as { retirementPlan: unknown };
    expect(result.retirementPlan).toEqual(retirementPlanFixture);
  });

  it("loader: a backend 404 renders the normal not-found page", async () => {
    backendFetch.mockRejectedValue(notFound());
    const err = await caught(loader(loaderArgs()));
    expect(err).toBeInstanceOf(Response);
    expect((err as Response).status).toBe(404);
    expect((err as Response).statusText).toBe("Not Found");
    expect(await (err as Response).text()).toBe("Not Found");
  });

  it("loader: other backend failures are not turned into a 404", async () => {
    const boom = new BackendError("server", "/retirement-plan", 500);
    backendFetch.mockRejectedValue(boom);
    expect(await caught(loader(loaderArgs()))).toBe(boom);
  });

  it("action: a backend 404 renders the normal not-found page", async () => {
    backendFetch.mockRejectedValue(notFound());
    const err = await caught(action(actionArgs()));
    expect(err).toBeInstanceOf(Response);
    expect((err as Response).status).toBe(404);
  });
});
