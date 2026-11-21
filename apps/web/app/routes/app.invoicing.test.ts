// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => await vi.importActual("react-router"));

const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  backendFetch: (...a: unknown[]) => backendFetch(...a),
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
  });

  it("loader fetches invoicing settings, work logs, and invoices and derives settingsEtag", async () => {
    backendFetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === "/invoicing/settings") return { settings: settingsFixture };
      if (endpoint === "/work-logs") return { entries: [], nextCursor: null };
      if (endpoint === "/invoices") return { invoices: [], nextCursor: null };
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });

    const data = await loader(loaderArgs());
    expect(data).toEqual({
      settings: settingsFixture,
      settingsEtag: '"2026-11-15T10:00:00.000Z"',
      workLogs: [],
      invoices: [],
    });
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
