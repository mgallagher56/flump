// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const backendFetch = vi.fn();
const backendFetchAll = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
  backendFetchAll: (...a: unknown[]) => backendFetchAll(...a),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "tok" }),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));
vi.mock("~/features/invoicing/components/InvoicingWorkspace", () => ({
  InvoicingWorkspace: () => null,
}));

import { action, loader } from "./app.invoicing";

const settingsFixture = {
  id: "11111111-1111-4111-8111-111111111111",
  defaultHourlyRate: 75,
  businessName: "Studio North Ltd",
  businessAddress: null,
  businessEmail: null,
  vatNumber: "GB123456789",
  invoicePrefix: "INV-",
  nextInvoiceSequence: 2,
  defaultPaymentTermsDays: 30,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-15T10:00:00.000Z",
};

const loaderArgs = () =>
  ({ request: new Request("http://localhost/app/invoicing"), params: {}, context: {} }) as never;

const actionArgs = (intent: string, fields: Record<string, string>) => {
  const body = new FormData();
  body.set("intent", intent);
  for (const [k, v] of Object.entries(fields)) {
    body.set(k, v);
  }
  return {
    request: new Request("http://localhost/app/invoicing", { method: "POST", body }),
    params: {},
    context: {},
  } as never;
};

describe("app.invoicing route loader and action (E37 S2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  let profile: { employmentType: string | null } = { employmentType: null };
  const workspace = (taxRecords: unknown[] = [], employmentType: string | null = null) => {
    profile = { employmentType };
    backendFetchAll.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/tax-records") return taxRecords;
      if (endpoint === "/accounts") return [];
      throw new Error(`Unexpected list ${endpoint}`);
    });
  };

  const backendReturnsEmptyLists = () => {
    workspace();
    return backendFetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/invoicing/settings") return { settings: settingsFixture };
      if (endpoint === "/work-logs") return { entries: [], nextCursor: null };
      if (endpoint === "/invoices") return { invoices: [], nextCursor: null };
      if (endpoint === "/user-profile") return profile;
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });
  };

  it("loader fetches invoicing settings, work logs, and invoices and derives settingsEtag", async () => {
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    backendReturnsEmptyLists();

    const data = await loader(loaderArgs());
    expect(data).toEqual({
      settings: settingsFixture,
      settingsEtag: '"2026-11-15T10:00:00.000Z"',
      workLogs: [],
      invoices: [],
      today: "2026-11-25",
      mtdPosition: { kind: "none" },
    });
    // No rental records, so accounts are not read.
    expect(backendFetchAll.mock.calls.map(([endpoint]) => endpoint)).toEqual(["/tax-records"]);
  });

  it("loader still loads with no Making Tax Digital line when the tax records fail", async () => {
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    backendReturnsEmptyLists();
    backendFetchAll.mockRejectedValue(new Error("tax records down"));
    const data = await loader(loaderArgs());
    expect(data.mtdPosition).toEqual({ kind: "none" });
    expect(data.settings).toEqual(settingsFixture);
  });

  it("loader gives the Making Tax Digital position from the recorded tax records", async () => {
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    backendReturnsEmptyLists();
    // 2025/26 self-employed income of £31,000 is over £30,000, the threshold for 6 April 2027.
    workspace([
      {
        id: "r1",
        type: "income",
        source: "self-employed",
        category: "self_employed_income",
        name: "Invoices",
        amount: "31000.00",
        frequency: "annual",
        date: "2025-06-01",
        endDate: null,
        notes: null,
      },
    ]);
    const data = await loader(loaderArgs());
    expect(data.mtdPosition).toMatchObject({
      kind: "over",
      check: { threshold: { startDate: "2027-04-06", thresholdGbp: 30_000 } },
    });
  });

  it("loader reads accounts only when a rental record needs its share", async () => {
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    backendReturnsEmptyLists();
    workspace([
      {
        id: "r2",
        type: "income",
        source: "rental",
        category: "rental_income",
        name: "Rent",
        amount: 12000,
        frequency: "annual",
        date: "2025-06-01",
      },
    ]);
    const data = await loader(loaderArgs());
    expect(backendFetchAll.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      "/tax-records",
      "/accounts",
    ]);
    // 12,000 is not over 30,000 for 2025/26, and the year is finished, so only the general line.
    expect(data.mtdPosition).toEqual({ kind: "unknown" });
  });

  it("loader gives the general position to a self-employed user with no records", async () => {
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    backendReturnsEmptyLists();
    workspace([], "self-employed");
    const data = await loader(loaderArgs());
    expect(data.mtdPosition).toEqual({ kind: "unknown" });
  });

  it("loader's today is the Europe/London date, which is a day ahead of UTC late on a BST evening", async () => {
    // 23:30 UTC on 31 March 2027 is 00:30 BST on 1 April 2027 (BST began 28 March 2027), so new
    // work, issue and paid dates default to the London day, not the UTC one.
    vi.setSystemTime(new Date("2027-03-31T23:30:00Z"));
    backendReturnsEmptyLists();

    const data = await loader(loaderArgs());
    expect(data.today).toBe("2027-04-01");
  });

  it("action sends If-Match on conditional PATCH routes (/invoicing/settings, /work-logs/:id, /invoices/:id)", async () => {
    backendFetch.mockResolvedValue({ settings: settingsFixture });

    await action(
      actionArgs("update-settings", {
        payload: JSON.stringify({ defaultHourlyRate: 90, vatNumber: "GB123456789" }),
        version: "2026-11-15T10:00:00.000Z",
      }),
    );
    expect(backendFetch).toHaveBeenCalledWith(
      "/invoicing/settings",
      expect.objectContaining({
        method: "PATCH",
        body: { defaultHourlyRate: 90, vatNumber: "GB123456789" },
        ifMatch: '"2026-11-15T10:00:00.000Z"',
      }),
    );

    const entryId = "22222222-2222-4222-8222-222222222201";
    backendFetch.mockResolvedValue({ entry: { id: entryId } });
    await action(
      actionArgs("update-work-log", {
        id: entryId,
        payload: JSON.stringify({ hoursWorked: 5 }),
        version: "2026-11-18T17:00:00.000Z",
      }),
    );
    expect(backendFetch).toHaveBeenCalledWith(
      `/work-logs/${entryId}`,
      expect.objectContaining({
        method: "PATCH",
        body: { hoursWorked: 5 },
        ifMatch: '"2026-11-18T17:00:00.000Z"',
      }),
    );

    const invoiceId = "33333333-3333-4333-8333-333333333301";
    backendFetch.mockResolvedValue({ invoice: { id: invoiceId } });
    await action(
      actionArgs("update-invoice", {
        id: invoiceId,
        payload: JSON.stringify({ clientName: "Updated Client", vatRatePct: 20 }),
        version: "2026-11-06T09:00:00.000Z",
      }),
    );
    expect(backendFetch).toHaveBeenCalledWith(
      `/invoices/${invoiceId}`,
      expect.objectContaining({
        method: "PATCH",
        body: { clientName: "Updated Client", vatRatePct: 20 },
        ifMatch: '"2026-11-06T09:00:00.000Z"',
      }),
    );

    await action(
      actionArgs("sync-invoice-to-tax", {
        id: invoiceId,
        version: "2026-11-06T09:00:00.000Z",
      }),
    );
    expect(backendFetch).toHaveBeenCalledWith(
      `/invoices/${invoiceId}/sync-to-tax`,
      expect.objectContaining({
        method: "POST",
        body: {},
        ifMatch: '"2026-11-06T09:00:00.000Z"',
      }),
    );
  });
});
