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

import { loader } from "./app.pension";

const args = () =>
  ({ request: new Request("http://localhost/app/pension"), params: {}, context: {} }) as never;
const run = async () =>
  ((await loader(args())) as unknown as { data: Record<string, unknown> }).data;

describe("app.pension loader (Retirement open to everyone, owner 20 Nov 2026)", () => {
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

  it("no longer asks the backend whether Retirement is available, and never returns the token", async () => {
    const payload = await run();
    expect(backendFetch).not.toHaveBeenCalled();
    expect(payload).not.toHaveProperty("retirementAvailable");
    expect(payload.accounts).toEqual([]);
    expect(JSON.stringify(payload)).not.toContain("server-only-token");
  });
});
