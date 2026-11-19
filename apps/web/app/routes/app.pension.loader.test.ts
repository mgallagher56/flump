import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the loader needs the real `data`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const backendFetch = vi.fn();
const loadWorkspaceSnapshot = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
  loadWorkspaceSnapshot: (...a: unknown[]) => loadWorkspaceSnapshot(...a),
}));
const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => {
    if (!accessToken) throw new Error("no token");
    return accessToken;
  },
}));
vi.mock("~/containers/pension/PensionContainer", () => ({ default: () => null }));

import { RetirementPlanResponse } from "@flump/api-contract";
import { BackendError } from "~/services/backend-error";
import { retirementPlanFixture } from "~/test/fixtures/contractResponses";
import { loader } from "./app.pension";

const args = () =>
  ({ request: new Request("http://localhost/app/pension"), params: {}, context: {} }) as never;
const run = async () =>
  ((await loader(args())) as unknown as { data: Record<string, unknown> }).data;

describe("app.pension loader: retirementAvailable (RD9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({ user: { id: "u1" }, accessToken: "tok" });
    loadWorkspaceSnapshot.mockResolvedValue({
      accounts: [],
      accountDetails: [],
      userProfile: { id: "p1" },
      user: { id: "u1" },
      accessToken: "server-only-token",
    });
  });

  it("is true when the backend serves the retirement plan", async () => {
    backendFetch.mockResolvedValue({ plan: retirementPlanFixture });
    const payload = await run();
    expect(payload.retirementAvailable).toBe(true);
    expect(backendFetch).toHaveBeenCalledWith(
      "/retirement-plan",
      expect.objectContaining({
        method: "GET",
        schema: RetirementPlanResponse,
        accessToken: "tok",
      }),
    );
    expect(JSON.stringify(payload)).not.toContain("server-only-token");
  });

  it("is false when the backend answers 404", async () => {
    backendFetch.mockRejectedValue(new BackendError("not-found", "/retirement-plan", 404));
    expect((await run()).retirementAvailable).toBe(false);
  });

  it("is false on any other failure, and never fails the pension page", async () => {
    backendFetch.mockRejectedValue(new BackendError("server", "/retirement-plan", 500));
    expect((await run()).retirementAvailable).toBe(false);
    backendFetch.mockRejectedValue(new TypeError("network"));
    expect((await run()).retirementAvailable).toBe(false);
    getAuthSession.mockResolvedValue({ user: { id: "u1" }, accessToken: undefined });
    const payload = await run();
    expect(payload.retirementAvailable).toBe(false);
    expect(payload.accounts).toEqual([]);
  });
});
