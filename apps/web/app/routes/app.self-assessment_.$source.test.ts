import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; loaders need the real `data` and `redirect`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const loadWorkspaceSnapshot = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  loadWorkspaceSnapshot: (...a: unknown[]) => loadWorkspaceSnapshot(...a),
  backendFetch: vi.fn(),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "token" }),
  requireAccessToken: ({ accessToken }: { accessToken: string }) => accessToken,
}));

const sourceRoute = await import("./app.self-assessment_.$source");
const listRoute = await import("./app.self-assessment");
const { taxAction } = await import("~/features/tax/taxActions.server");

const argsFor = (source: string) =>
  ({
    request: new Request(`http://app.test/app/self-assessment/${source}`),
    params: { source },
  }) as never;

const snapshot = (enabledPages: string[] | null) => ({
  user: { id: "u1" },
  taxRecords: [{ id: "t1", source: "rental" }],
  userProfile: { enabledPages },
  accounts: [{ id: "p1", type: "Property", accountSubtype: "rental" }],
});

describe("app.self-assessment_.$source", () => {
  beforeEach(() => loadWorkspaceSnapshot.mockReset());

  it("shares the list page's action, so fetchers post to their own route", () => {
    expect(sourceRoute.action).toBe(taxAction);
    expect(listRoute.action).toBe(taxAction);
  });

  it.each(["self-employed", "rental", "savings", "paye"])("loads the %s page", async (source) => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshot(["tax"]));
    const res = (await sourceRoute.loader(argsFor(source))) as unknown as {
      data: Record<string, unknown>;
    };
    expect(res.data.source).toBe(source);
    expect(res.data.records).toEqual([{ id: "t1", source: "rental" }]);
    // The accounts give each rental property's share and the calculated figures (slice 7).
    expect(res.data.accounts).toEqual([{ id: "p1", type: "Property", accountSubtype: "rental" }]);
    expect(loadWorkspaceSnapshot).toHaveBeenCalledWith(expect.anything(), { includeTax: true });
  });

  it("answers 404 for any other source, before loading anything", async () => {
    let thrown: unknown;
    try {
      await sourceRoute.loader(argsFor("pension"));
    } catch (e) {
      thrown = e;
    }
    expect((thrown as { init?: { status?: number } }).init?.status).toBe(404);
    expect((thrown as { data?: { kind?: string } }).data?.kind).toBe("not-found");
    expect(loadWorkspaceSnapshot).not.toHaveBeenCalled();
  });

  it("sends someone who has not turned Self Assessment on to the list page", async () => {
    loadWorkspaceSnapshot.mockResolvedValue(snapshot(["accounts"]));
    const result = (await sourceRoute.loader(argsFor("rental"))) as unknown as {
      data: { optedIn: boolean; records: unknown[]; userProfile: unknown };
    };
    expect(result.data.optedIn).toBe(false);
    // Nothing from the records or profile goes to a page that only redirects.
    expect(result.data.records).toEqual([]);
    expect(result.data.userProfile).toBeNull();
    expect((result.data as { accounts?: unknown[] }).accounts).toEqual([]);
  });

  it("titles the page with the source", () => {
    const meta = sourceRoute.meta({ params: { source: "self-employed" } } as never);
    expect(meta).toEqual([{ title: "Self-employed | Self Assessment | Flump" }]);
  });
});
