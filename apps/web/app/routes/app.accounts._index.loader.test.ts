import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the loader needs the real `data`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const loadWorkspaceSnapshot = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  loadWorkspaceSnapshot: (...a: unknown[]) => loadWorkspaceSnapshot(...a),
  backendFetch: vi.fn(),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn(),
  requireAccessToken: vi.fn(),
}));

import { loader } from "./app.accounts._index";

const snapshot = (userProfile: Record<string, unknown>) => ({
  accounts: [],
  accountDetails: [],
  bankConnections: [],
  user: null,
  accessToken: undefined,
  userProfile,
});

const psaBand = async (): Promise<unknown> => {
  const result = (await loader({
    request: new Request("http://localhost/accounts"),
    params: {},
    context: {},
  } as never)) as unknown as { data: { psaTaxBand: unknown } };
  return result.data.psaTaxBand;
};

describe("accounts loader PSA band", () => {
  beforeEach(() => {
    loadWorkspaceSnapshot.mockReset();
  });

  const base = { annualSalary: 45000, employmentType: "employed", taxRegion: "ENGLAND" };

  it("is basic on a £45,000 salary alone", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshot(base));
    expect(await psaBand()).toBe("basic");
  });

  it("counts saved rental income: £45,000 salary plus £10,000 rent is higher rate", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(
      snapshot({ ...base, hasRentalIncome: true, rentalIncomeMonthly: 10000 / 12 }),
    );
    expect(await psaBand()).toBe("higher");
  });
});
