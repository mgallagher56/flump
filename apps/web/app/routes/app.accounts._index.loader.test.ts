import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the loader needs the real `data`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const loadWorkspaceSnapshot = vi.fn();
const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  loadWorkspaceSnapshot: (...a: unknown[]) => loadWorkspaceSnapshot(...a),
  backendFetch: (...a: unknown[]) => backendFetch(...a),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn(),
  requireAccessToken: vi.fn(),
}));

import { loader } from "./app.accounts._index";

const snapshot = (accessToken?: string) => ({
  accounts: [],
  accountDetails: [],
  bankConnections: [],
  user: null,
  accessToken,
  userProfile: null,
});

const load = async (): Promise<Record<string, unknown>> => {
  const result = (await loader({
    request: new Request("http://localhost/accounts"),
    params: {},
    context: {},
  } as never)) as unknown as { data: Record<string, unknown> };
  return result.data;
};

// D8: the bank connections block shows only for owner-allowlisted accounts, decided by the
// backend capability (E19 D3-B). The loader fails closed.
describe("accounts loader bank connect capability", () => {
  beforeEach(() => {
    loadWorkspaceSnapshot.mockReset();
    backendFetch.mockReset();
  });

  it("is off without an access token, and never asks the backend", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshot());
    expect((await load()).bankConnectionsEnabled).toBe(false);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("is on only when the capability says enabled", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshot("token"));
    backendFetch.mockResolvedValue({ enabled: true });
    expect((await load()).bankConnectionsEnabled).toBe(true);
    expect(backendFetch.mock.calls[0]?.[0]).toBe("/bank-connections/capability");
  });

  it("is off when the capability call fails", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshot("token"));
    backendFetch.mockRejectedValue(new Error("feature_disabled"));
    expect((await load()).bankConnectionsEnabled).toBe(false);
  });

  it("no longer sends a savings allowance band (the ISA card moved to savings)", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshot());
    expect(await load()).not.toHaveProperty("psaTaxBand");
  });
});
