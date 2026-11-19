import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; actions need the real `data` and `redirect`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
  authHeader: ({ accessToken }: { accessToken?: string }) => ({
    Authorization: `Bearer ${accessToken}`,
  }),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));

import { BankSyncOrchestrator } from "@flump/banking/server";
import { apiConfig } from "~/config.server";
import { accountFixture, contractFetch, jsonResponse } from "~/test/fixtures/contractResponses";
import { action as accountsAction, MORTGAGE_NOT_LINKED_NOTICE } from "./app.accounts._index";
import { action as debtAction } from "./app.debt";
import { action as onboardingAction } from "./app.onboarding";
import { action as pensionAction } from "./app.pension";
import { action as savingsAction } from "./app.savings";
import { action as taxAction } from "./app.self-assessment";

type Action = (args: any) => Promise<any>;

interface Case {
  route: string;
  action: Action;
  intent: string;
  fields: Record<string, string>;
  params?: Record<string, string>;
  method: string;
  path: string;
  body?: unknown;
}

const cases: Case[] = [
  {
    route: "debt",
    action: debtAction,
    intent: "createDebt",
    fields: {
      name: "Barclaycard",
      type: "Credit Card",
      balance: "1200",
      interestRate: "",
      monthlyContribution: "30",
    },
    method: "POST",
    path: "/accounts",
    body: {
      name: "Barclaycard",
      type: "Credit Card",
      balance: -1200,
      interestRate: null,
      monthlyContribution: 30,
    },
  },
  {
    route: "debt",
    action: debtAction,
    intent: "createDebt",
    fields: {
      name: "Balance transfer card",
      type: "Credit Card",
      balance: "0",
      interestRate: "0",
      monthlyContribution: "",
      creditLimit: "5000",
      promoZeroPercentUntil: "2027-06-30",
    },
    method: "POST",
    path: "/accounts",
    body: {
      name: "Balance transfer card",
      type: "Credit Card",
      balance: 0,
      interestRate: 0,
      monthlyContribution: null,
      creditLimit: 5000,
      promoZeroPercentUntil: "2027-06-30",
    },
  },
  {
    route: "debt",
    action: debtAction,
    intent: "updateDebt",
    fields: { accountId: "d1", name: "Card", balance: "-900", interestRate: "0" },
    method: "PATCH",
    path: "/accounts/d1",
    body: { name: "Card", balance: -900, interestRate: 0 },
  },
  {
    // A joint car loan from the Debt page, saved with its loan kind (slice 4).
    route: "debt",
    action: debtAction,
    intent: "createDebt",
    fields: {
      name: "Car",
      type: "Loan",
      balance: "8000",
      interestRate: "",
      monthlyContribution: "",
      accountSubtype: "car_finance",
      ownership: "joint",
      sharePercent: "50",
    },
    method: "POST",
    path: "/accounts",
    body: {
      name: "Car",
      type: "Loan",
      balance: -8000,
      interestRate: null,
      monthlyContribution: null,
      accountSubtype: "car_finance",
      ownership: "joint",
      sharePercent: 50,
    },
  },
  {
    route: "debt",
    action: debtAction,
    intent: "updateDebt",
    fields: { accountId: "d1", balance: "850", ownership: "sole" },
    method: "PATCH",
    path: "/accounts/d1",
    body: { balance: -850, ownership: "sole", sharePercent: null },
  },
  {
    // A loan kind cleared back to "Not set" on an edit is sent as null, not dropped.
    route: "debt",
    action: debtAction,
    intent: "updateDebt",
    fields: { accountId: "d1", accountSubtype: "" },
    method: "PATCH",
    path: "/accounts/d1",
    body: { accountSubtype: null },
  },
  {
    // A loan kind changed on an edit is sent as the new kind.
    route: "debt",
    action: debtAction,
    intent: "updateDebt",
    fields: { accountId: "d1", accountSubtype: "car_finance" },
    method: "PATCH",
    path: "/accounts/d1",
    body: { accountSubtype: "car_finance" },
  },
  {
    route: "debt",
    action: debtAction,
    intent: "deleteDebt",
    fields: { accountId: "d1" },
    method: "DELETE",
    path: "/accounts/d1",
  },
  {
    route: "accounts",
    action: accountsAction,
    intent: "create",
    fields: { name: "ISA", type: "Saving", balance: "100.5" },
    method: "POST",
    path: "/accounts",
    body: { name: "ISA", type: "Saving", balance: 100.5 },
  },
  {
    route: "accounts",
    action: accountsAction,
    intent: "update",
    fields: { accountId: "a1", name: "ISA", type: "Saving" },
    method: "PATCH",
    path: "/accounts/a1",
    body: { name: "ISA", type: "Saving" },
  },
  {
    route: "accounts",
    action: accountsAction,
    intent: "delete",
    fields: { accountId: "a1" },
    method: "DELETE",
    path: "/accounts/a1",
  },
  {
    route: "accounts",
    action: accountsAction,
    intent: "syncConnection",
    fields: { connectionId: "c1" },
    method: "POST",
    path: "/bank-connections/c1/refresh",
  },
  {
    route: "accounts",
    action: accountsAction,
    intent: "disconnectConnection",
    fields: { connectionId: "c1" },
    method: "DELETE",
    path: "/bank-connections/c1",
  },
  {
    route: "accounts",
    action: accountsAction,
    intent: "connectBank",
    fields: { institutionId: "inst", token: "bank-token", authType: "token" },
    method: "POST",
    path: "/bank-connections",
    body: { institutionId: "inst", token: "bank-token" },
  },
  {
    route: "pension",
    action: pensionAction,
    intent: "createPensionAccount",
    fields: { name: "Work", balance: "1000", interestRate: "4", monthlyContribution: "50" },
    method: "POST",
    path: "/accounts",
    body: {
      name: "Work",
      type: "Pension",
      balance: 1000,
      interestRate: 4,
      monthlyContribution: 50,
      isCurrent: true,
    },
  },
  {
    route: "pension",
    action: pensionAction,
    intent: "updatePensionAccount",
    fields: { accountId: "p1", name: "Work", balance: "2000", isCurrent: "false" },
    method: "PATCH",
    path: "/accounts/p1",
    body: { name: "Work", balance: 2000, isCurrent: false, monthlyContribution: null },
  },
  {
    route: "pension",
    action: pensionAction,
    intent: "deletePensionAccount",
    fields: { accountId: "p1" },
    method: "DELETE",
    path: "/accounts/p1",
  },
  {
    route: "pension",
    action: pensionAction,
    intent: "updatePensionContributions",
    fields: { pensionPercent: "5", annualSalary: "40000", isSalarySacrifice: "true" },
    method: "PATCH",
    path: "/user-profile",
    body: { pensionPercent: 5, annualSalary: 40000, isSalarySacrifice: true },
  },
  {
    route: "pension",
    action: pensionAction,
    intent: "completePensionWizard",
    fields: { name: "Work", balance: "10", annualSalary: "30000", pensionPercent: "5" },
    method: "POST",
    path: "/accounts",
    body: {
      name: "Work",
      type: "Pension",
      balance: 10,
      // A blank growth rate stays unset, never an assumed 5%.
      interestRate: null,
      monthlyContribution: null,
    },
  },
  {
    route: "savings",
    action: savingsAction,
    intent: "createSavingsAccount",
    fields: { name: "Rainy day", balance: "250", interestRate: "3.5" },
    method: "POST",
    path: "/accounts",
    body: {
      name: "Rainy day",
      type: "Saving",
      balance: 250,
      interestRate: 3.5,
      monthlyContribution: null,
    },
  },
  {
    route: "savings",
    action: savingsAction,
    intent: "updateSavingsAccount",
    fields: { accountId: "s1", name: "Rainy day", interestRate: "2" },
    method: "PATCH",
    path: "/accounts/s1",
    body: { name: "Rainy day", interestRate: 2 },
  },
  {
    // A saved joint account saved as an ISA: the dialog sends sole, and no share (the backend
    // clears the share of a sole account).
    route: "savings",
    action: savingsAction,
    intent: "updateSavingsAccount",
    fields: {
      accountId: "s1",
      name: "Joint saver",
      type: "Saving",
      accountSubtype: "cash_isa",
      ownership: "sole",
    },
    method: "PATCH",
    path: "/accounts/s1",
    body: { name: "Joint saver", type: "Saving", accountSubtype: "cash_isa", ownership: "sole" },
  },
  {
    // A saver made joint from the Savings page (SD-8).
    route: "savings",
    action: savingsAction,
    intent: "updateSavingsAccount",
    fields: { accountId: "s1", ownership: "joint", sharePercent: "40" },
    method: "PATCH",
    path: "/accounts/s1",
    body: { ownership: "joint", sharePercent: 40 },
  },
  {
    route: "savings",
    action: savingsAction,
    intent: "createSavingsAccount",
    fields: { name: "Our pot", balance: "100", ownership: "joint", sharePercent: "50" },
    method: "POST",
    path: "/accounts",
    body: {
      name: "Our pot",
      type: "Saving",
      balance: 100,
      interestRate: null,
      monthlyContribution: null,
      ownership: "joint",
      sharePercent: 50,
    },
  },
  {
    route: "savings",
    action: savingsAction,
    intent: "deleteAccount",
    fields: { accountId: "s1" },
    method: "DELETE",
    path: "/accounts/s1",
  },
  {
    route: "savings",
    action: savingsAction,
    intent: "updateSavingsSettings",
    fields: { savingsAllocationMode: "fixed", monthlySavingsTarget: "300" },
    method: "PATCH",
    path: "/user-profile",
    body: { savingsAllocationMode: "fixed", monthlySavingsTarget: 300 },
  },
  {
    route: "tax",
    action: taxAction,
    intent: "update-profile",
    // No share typed: it is not sent, so the saved share stays as it was (never 0 or 100 invented).
    fields: { annualSalary: "50000.5" },
    method: "PATCH",
    path: "/user-profile",
    body: { annualSalary: 50000.5 },
  },
  {
    route: "tax",
    action: taxAction,
    intent: "create-transaction",
    fields: {
      name: "Rent",
      source: "Tenant",
      type: "income",
      category: "rental",
      amount: "900.25",
      date: "2024-05-01",
      frequency: "monthly",
    },
    method: "POST",
    path: "/tax-records",
    body: {
      name: "Rent",
      source: "Tenant",
      type: "income",
      category: "rental",
      amount: 900.25,
      date: "2024-05-01",
      frequency: "monthly",
      endDate: null,
      notes: null,
      receiptFilename: null,
      receiptMimeType: null,
      receiptData: null,
    },
  },
  {
    route: "tax",
    action: taxAction,
    intent: "update-transaction",
    fields: { id: "t1", name: "Rent", amount: "10", notes: "note" },
    method: "PATCH",
    path: "/tax-records/t1",
    body: {
      name: "Rent",
      source: null,
      type: null,
      category: null,
      amount: 10,
      date: null,
      frequency: null,
      endDate: null,
      notes: "note",
      receiptFilename: null,
      receiptMimeType: null,
    },
  },
  {
    route: "tax",
    action: taxAction,
    intent: "delete-transaction",
    fields: { id: "t1" },
    method: "DELETE",
    path: "/tax-records/t1",
  },
  {
    route: "tax",
    action: taxAction,
    intent: "delete-tax-year",
    fields: { recordIds: JSON.stringify(["t1"]) },
    method: "DELETE",
    path: "/tax-records/t1",
  },
  {
    route: "tax",
    action: taxAction,
    intent: "bulk-create-transactions",
    fields: {
      records: JSON.stringify([{ name: "x" }]),
      capPreviousRecordIds: JSON.stringify(["old"]),
    },
    method: "POST",
    path: "/tax-records/bulk",
    body: { records: [{ name: "x" }], capPreviousRecordIds: ["old"] },
  },
];

const makeArgs = (c: Case): any => {
  // URL-encoded, as `fetcher.submit` sends an object. The test environment's multipart FormData
  // drops an empty field, and an empty field is how a form clears a value.
  const form = new URLSearchParams();
  form.set("intent", c.intent);
  for (const [k, v] of Object.entries(c.fields)) form.set(k, v);
  return {
    request: new Request("http://localhost/app", { method: "POST", body: form }),
    params: c.params ?? {},
    context: {},
  };
};

/** `body` when given; otherwise a contract-valid body for the route (2xx) or `{}` (errors). */
const respond = (status: number, body?: unknown) =>
  vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (body !== undefined) return jsonResponse(body, status);
    if (status < 300) return contractFetch(status)(input, init);
    return new Response("{}", { status });
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getAuthSession.mockResolvedValue({ user: { id: "u1" }, accessToken: "tok" });
});

describe.each(cases)("$route action, intent $intent", (c) => {
  it("calls the backend with the expected method, URL, auth and body", async () => {
    const fetchMock = respond(200);
    globalThis.fetch = fetchMock;
    const res: any = await c.action(makeArgs(c));
    expect(res.data).toMatchObject({ success: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiConfig.apiBaseUrl}/v1${c.path}`);
    expect(init.method).toBe(c.method);
    expect(init.headers.Authorization).toBe("Bearer tok");
    if (c.body === undefined) expect(init.body).toBeUndefined();
    else expect(JSON.parse(init.body)).toEqual(c.body);
  });

  it("returns success:false with the backend status for a 503 and never retries", async () => {
    const fetchMock = respond(503, { message: "secret backend text" });
    globalThis.fetch = fetchMock;
    const res: any = await c.action(makeArgs(c));
    expect(res.init.status).toBe(503);
    expect(res.data.success).toBe(false);
    expect(JSON.stringify(res.data)).not.toMatch(/secret|tok|localhost|http/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lets an auth redirect Response pass through", async () => {
    const redirectResponse = new Response(null, { status: 302, headers: { Location: "/login" } });
    getAuthSession.mockRejectedValue(redirectResponse);
    globalThis.fetch = respond(200);
    await expect(c.action(makeArgs(c))).rejects.toBe(redirectResponse);
  });
});

describe("tax action, bulk-create-transactions chunking", () => {
  const bulkArgs = (records: unknown[], cap: unknown[]) =>
    makeArgs({
      route: "tax",
      action: taxAction,
      intent: "bulk-create-transactions",
      fields: { records: JSON.stringify(records), capPreviousRecordIds: JSON.stringify(cap) },
      method: "POST",
      path: "/tax-records/bulk",
    });

  it("sends exactly 500 records and 500 cap ids as a single request", async () => {
    const fetchMock = respond(200, []);
    globalThis.fetch = fetchMock;
    const records = Array.from({ length: 500 }, (_, i) => ({ name: `r${i}` }));
    const cap = Array.from({ length: 500 }, (_, i) => ({ id: `id${i}`, endDate: "2025-03-31" }));
    await taxAction(bulkArgs(records, cap));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      records,
      capPreviousRecordIds: cap,
    });
  });

  it("creates every record chunk before any cap chunk, each at most 500", async () => {
    const fetchMock = respond(200, []);
    globalThis.fetch = fetchMock;
    const records = Array.from({ length: 1100 }, (_, i) => ({ name: `r${i}` }));
    const cap = Array.from({ length: 501 }, (_, i) => ({ id: `id${i}`, endDate: "2025-03-31" }));
    const res: any = await taxAction(bulkArgs(records, cap));
    expect(res.data).toMatchObject({ success: true });
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies).toHaveLength(5);
    for (const b of bodies) {
      expect(b.records.length).toBeLessThanOrEqual(500);
      expect(b.capPreviousRecordIds.length).toBeLessThanOrEqual(500);
    }
    expect(bodies.slice(0, 3).every((b) => b.capPreviousRecordIds.length === 0)).toBe(true);
    expect(bodies.slice(3).every((b) => b.records.length === 0)).toBe(true);
    expect(bodies.flatMap((b) => b.records)).toEqual(records);
    expect(bodies.flatMap((b) => b.capPreviousRecordIds)).toEqual(cap);
  });

  it("reports a partial copy and never sends caps when a later chunk fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("[]", { status: 200 }))
      .mockResolvedValue(new Response("{}", { status: 503 }));
    globalThis.fetch = fetchMock;
    const records = Array.from({ length: 600 }, (_, i) => ({ name: `r${i}` }));
    const cap = [{ id: "old", endDate: "2025-03-31" }];
    const res: any = await taxAction(bulkArgs(records, cap));
    expect(res.init.status).toBe(503);
    expect(res.data.success).toBe(false);
    expect(res.data.error).toMatch(/We copied 500 of 600 records/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops at the first failing chunk", async () => {
    const fetchMock = respond(503);
    globalThis.fetch = fetchMock;
    const records = Array.from({ length: 600 }, (_, i) => ({ name: `r${i}` }));
    const res: any = await taxAction(bulkArgs(records, []));
    expect(res.init.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("accounts action, connectBank", () => {
  it("returns a not-available error for OAuth even when the backend call fails", async () => {
    globalThis.fetch = respond(503);
    const form = new FormData();
    form.set("intent", "connectBank");
    form.set("institutionId", "inst");
    form.set("authType", "oauth");
    const res: any = await accountsAction({
      request: new Request("http://localhost/app", { method: "POST", body: form }),
      params: {},
      context: {},
    } as any);
    // The failed backend call is tolerated; bank OAuth is cut so there is no redirect to offer.
    expect(res.data).toEqual({
      success: false,
      error: "Connecting a bank is not available at the moment.",
    });
    expect(res.init?.status).toBe(501);
  });

  it("returns the backend redirect URL for OAuth", async () => {
    globalThis.fetch = respond(200, {
      success: true,
      oauth: true,
      redirectUrl: "https://bank.example/auth",
    });
    const form = new FormData();
    form.set("intent", "connectBank");
    form.set("institutionId", "inst");
    form.set("authType", "oauth");
    const res: any = await accountsAction({
      request: new Request("http://localhost/app", { method: "POST", body: form }),
      params: {},
      context: {},
    } as any);
    expect(res.data).toEqual({
      success: true,
      oauth: true,
      redirectUrl: "https://bank.example/auth",
    });
  });
});

describe("accounts action, a mortgage and the property it is on", () => {
  const REQUEST_ID = "4c1f6a2e-0d3b-4e8a-9b7c-2f5e1d0a9c33";
  const MORTGAGE_ID = "00000000-0000-4000-8000-0000000000aa";
  const create = (fields: Record<string, string>) => {
    const form = new FormData();
    form.set("intent", "create");
    form.set("requestId", REQUEST_ID);
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    return accountsAction({
      request: new Request("http://localhost/app", { method: "POST", body: form }),
      params: {},
      context: {},
    } as any);
  };
  const createMortgage = (fields: Record<string, string>) =>
    create({ name: "Nationwide mortgage", type: "Mortgage", balance: "-200000", ...fields });

  /**
   * A small backend: POST /accounts saves a row, POST /accounts/mortgage-with-property saves the
   * pair, PATCH /accounts/:id answers with the row. `fail` turns a request into a 503.
   */
  const fakeBackend = (fail?: (req: { method: string; path: string }) => boolean) => {
    let next = 1;
    const fetchMock = vi
      .fn()
      .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        const path = new URL(String(input)).pathname;
        const body = init?.body ? JSON.parse(String(init.body)) : null;
        if (fail?.({ method, path })) return jsonResponse({ message: "Unavailable" }, 503);
        const row = (fields: Record<string, unknown>) => ({
          ...accountFixture,
          ...fields,
          id: `00000000-0000-4000-8000-00000000000${next++}`,
          ownership: fields.ownership ?? "sole",
          sharePercent: fields.sharePercent ?? null,
        });
        if (method === "POST" && path.endsWith("/accounts/mortgage-with-property")) {
          const mortgage = row({ ...body.mortgage, type: "Mortgage" });
          const property = row({ ...body.property, type: "Property" });
          return jsonResponse(
            { mortgage: { ...mortgage, linkedAccountId: property.id }, property },
            201,
          );
        }
        if (method === "POST" && path.endsWith("/accounts")) return jsonResponse(row(body), 201);
        if (method === "PATCH") return jsonResponse({ ...accountFixture, ...body }, 200);
        return contractFetch()(input, init);
      });
    return fetchMock;
  };
  const calls = (fetchMock: ReturnType<typeof vi.fn>, method: string) =>
    fetchMock.mock.calls.filter(([, init]) => ((init as RequestInit)?.method ?? "GET") === method);
  const paths = (fetchMock: ReturnType<typeof vi.fn>) =>
    fetchMock.mock.calls.map(([input]) => new URL(String(input)).pathname.replace(/^\/v1/, ""));
  const bodyOf = (call: unknown[] | undefined) =>
    JSON.parse(String((call?.[1] as RequestInit | undefined)?.body));
  const headersOf = (call: unknown[] | undefined) =>
    (call?.[1] as RequestInit | undefined)?.headers as Record<string, string>;

  it("adds the mortgage and its home in one call, linked, keyed from the dialog's request id", async () => {
    const fetchMock = fakeBackend();
    globalThis.fetch = fetchMock;
    const res: any = await createMortgage({
      homeValue: "325000",
      ownership: "joint",
      sharePercent: "40",
    });
    expect(res.data).toEqual({ success: true });
    expect(paths(fetchMock)).toEqual(["/accounts/mortgage-with-property"]);
    const posted = calls(fetchMock, "POST")[0];
    // The property takes the mortgage's ownership and share on the backend (decision 14 B), so
    // only its value is sent; the strict contract keeps form-only fields out.
    expect(bodyOf(posted)).toEqual({
      mortgage: {
        name: "Nationwide mortgage",
        balance: -200000,
        ownership: "joint",
        sharePercent: 40,
      },
      property: { balance: 325000 },
    });
    expect(headersOf(posted)["Idempotency-Key"]).toBe(`${REQUEST_ID}:mortgage`);
  });

  it("adds a buy-to-let mortgage with its rental the same way (the backend picks the kind)", async () => {
    const fetchMock = fakeBackend();
    globalThis.fetch = fetchMock;
    await createMortgage({
      homeValue: "250000",
      accountSubtype: "btl_mortgage",
      ownership: "sole",
    });
    expect(paths(fetchMock)).toEqual(["/accounts/mortgage-with-property"]);
    expect(bodyOf(calls(fetchMock, "POST")[0])).toMatchObject({
      mortgage: { accountSubtype: "btl_mortgage" },
      property: { balance: 250000 },
    });
  });

  it("links to a saved property with a plain add and sends no property value", async () => {
    const fetchMock = fakeBackend();
    globalThis.fetch = fetchMock;
    await createMortgage({
      homeValue: "325000",
      linkedAccountId: "11111111-2222-4333-8444-555555555555",
    });
    expect(paths(fetchMock)).toEqual(["/accounts"]);
    expect(bodyOf(calls(fetchMock, "POST")[0])).toMatchObject({
      type: "Mortgage",
      linkedAccountId: "11111111-2222-4333-8444-555555555555",
    });
  });

  it("adds only the mortgage without a value", async () => {
    const fetchMock = fakeBackend();
    globalThis.fetch = fetchMock;
    await createMortgage({});
    expect(paths(fetchMock)).toEqual(["/accounts"]);
    expect(headersOf(calls(fetchMock, "POST")[0])["Idempotency-Key"]).toBe(
      `${REQUEST_ID}:mortgage`,
    );
  });

  it("returns the error when the pair cannot be saved, with nothing else written", async () => {
    const fetchMock = fakeBackend(({ path }) => path.endsWith("/mortgage-with-property"));
    globalThis.fetch = fetchMock;
    const res: any = await createMortgage({ homeValue: "325000" });
    expect(res.data.success).toBe(false);
    expect(res.init.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("links the mortgage to a property added for it, at the mortgage's version", async () => {
    const fetchMock = fakeBackend();
    globalThis.fetch = fetchMock;
    const res: any = await create({
      name: "Home (your estimate)",
      type: "Property",
      accountSubtype: "home",
      balance: "300000",
      linkMortgageId: MORTGAGE_ID,
      linkMortgageVersion: "2026-01-05T10:00:00.000Z",
    });
    expect(res.data).toEqual({ success: true });
    expect(paths(fetchMock)).toEqual(["/accounts", `/accounts/${MORTGAGE_ID}`]);
    const posted = bodyOf(calls(fetchMock, "POST")[0]);
    expect(posted).not.toHaveProperty("linkMortgageId");
    const patch = calls(fetchMock, "PATCH")[0];
    expect(bodyOf(patch)).toEqual({ linkedAccountId: "00000000-0000-4000-8000-000000000001" });
    expect(headersOf(patch)["If-Match"]).toBe('"2026-01-05T10:00:00.000Z"');
  });

  it("keeps the property and says so when the link fails", async () => {
    const fetchMock = fakeBackend(({ method }) => method === "PATCH");
    globalThis.fetch = fetchMock;
    const res: any = await create({
      name: "Home (your estimate)",
      type: "Property",
      balance: "300000",
      linkMortgageId: MORTGAGE_ID,
    });
    expect(res.data).toEqual({ success: true, notice: MORTGAGE_NOT_LINKED_NOTICE });
    expect(calls(fetchMock, "DELETE")).toHaveLength(0);
  });
});

describe("pension wizard", () => {
  const wizard = cases.find((c) => c.intent === "completePensionWizard") as Case;

  it("runs account, profile then checklist, and stops at the first failure", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(contractFetch())
      .mockResolvedValueOnce(new Response("{}", { status: 500 }));
    globalThis.fetch = fetchMock;
    const res: any = await pensionAction(makeArgs(wizard));
    expect(res.data.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks the pension checklist step complete on success", async () => {
    const fetchMock = respond(200);
    globalThis.fetch = fetchMock;
    await pensionAction(makeArgs(wizard));
    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe(`${apiConfig.apiBaseUrl}/v1/user-profile/checklist`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ step: "pension", completed: true });
  });
});

describe("onboarding action", () => {
  const args = (): any => {
    const form = new FormData();
    form.set("enabledPages", JSON.stringify(["accounts", "budget"]));
    return {
      request: new Request("http://localhost/app/onboarding", { method: "POST", body: form }),
      params: {},
      context: {},
    };
  };

  it("PATCHes the profile and redirects home on success", async () => {
    const fetchMock = respond(200);
    globalThis.fetch = fetchMock;
    const res: any = await onboardingAction(args());
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiConfig.apiBaseUrl}/v1/user-profile`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      enabledPages: ["accounts", "budget"],
      dashboardWidgets: ["accounts", "budget"],
      onboardingCompleted: true,
    });
  });

  it("returns the error instead of redirecting when the PATCH fails, so it cannot loop", async () => {
    const fetchMock = respond(500);
    globalThis.fetch = fetchMock;
    const res: any = await onboardingAction(args());
    expect(res).not.toBeInstanceOf(Response);
    expect(res.data.success).toBe(false);
    expect(res.init.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns success:false with status 503 for a 503", async () => {
    globalThis.fetch = respond(503);
    const res: any = await onboardingAction(args());
    expect(res.init.status).toBe(503);
  });
});

describe("tax action, receipts on update (E20-N15)", () => {
  const send = async (fields: Record<string, string>) => {
    const fetchMock = respond(200);
    globalThis.fetch = fetchMock;
    await taxAction(
      makeArgs({
        intent: "update-transaction",
        fields: { id: "t1", ...fields },
      } as unknown as Case),
    );
    return JSON.parse(fetchMock.mock.calls[0][1].body);
  };

  it("omits receiptData when the form has none, so the stored receipt is kept", async () => {
    const body = await send({ receiptFilename: "a.png", receiptMimeType: "image/png" });
    expect(body).not.toHaveProperty("receiptData");
    expect(body.receiptFilename).toBe("a.png");
  });

  it("sends receiptData for a newly chosen file", async () => {
    const body = await send({ receiptData: "data:image/png;base64,AAAA" });
    expect(body.receiptData).toBe("data:image/png;base64,AAAA");
  });

  it("sends null receiptData only when the clear flag is set", async () => {
    const body = await send({ receiptClear: "1" });
    expect(body.receiptData).toBeNull();
  });
});

describe("tax action, malformed JSON", () => {
  const run = (intent: string, fields: Record<string, string>) => {
    globalThis.fetch = respond(200);
    return taxAction(makeArgs({ intent, fields } as Case));
  };

  it.each([
    ["delete-tax-year", { recordIds: "not json" }],
    ["delete-tax-year", { recordIds: '{"a":1}' }],
    ["bulk-create-transactions", { records: "not json" }],
    ["bulk-create-transactions", { records: '{"a":1}' }],
    ["bulk-create-transactions", { records: "[]", capPreviousRecordIds: '"x"' }],
  ])("%s with %j returns a 400 and never calls the backend", async (intent, fields) => {
    const res: any = await run(intent, fields);
    expect(res.init.status).toBe(400);
    expect(res.data).toEqual({ success: false, error: expect.any(String) });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("action edge cases", () => {
  it("pension checklist PATCH failing still returns success", async () => {
    const wizard = cases.find((c) => c.intent === "completePensionWizard") as Case;
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(contractFetch())
      .mockImplementationOnce(contractFetch())
      .mockResolvedValueOnce(new Response("{}", { status: 503 }));
    const res: any = await pensionAction(makeArgs(wizard));
    expect(res.data).toEqual({ success: true });
  });

  it("OAuth bank connections return a clear not-available error", async () => {
    globalThis.fetch = respond(200, {});
    const form = new FormData();
    form.set("intent", "connectBank");
    form.set("institutionId", "inst");
    form.set("authType", "oauth");
    const res: any = await accountsAction({
      request: new Request("http://localhost/app", { method: "POST", body: form }),
      params: {},
      context: {},
    } as any);
    expect(res.init?.status ?? res.status).toBe(501);
    expect(res.data).toEqual({
      success: false,
      error: "Connecting a bank is not available at the moment.",
    });
  });
});

describe("path segment encoding", () => {
  const run = async (action: Action, fields: Record<string, string>, params = {}) => {
    const fetchMock = respond(200, {});
    globalThis.fetch = fetchMock;
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    await action({
      request: new Request("http://localhost/app", { method: "POST", body: form }),
      params,
      context: {},
    });
    return fetchMock.mock.calls.map((c: any[]) => c[0] as string);
  };
  const base = `${apiConfig.apiBaseUrl}/v1`;

  it("encodes accountId and connectionId in the accounts route", async () => {
    expect(await run(accountsAction, { intent: "delete", accountId: "a/../b" })).toEqual([
      `${base}/accounts/a%2F..%2Fb`,
    ]);
    expect(
      await run(accountsAction, { intent: "disconnectConnection", connectionId: "c/1" }),
    ).toEqual([`${base}/bank-connections/c%2F1`]);
    expect(await run(accountsAction, { intent: "syncConnection", connectionId: "c?1" })).toEqual([
      `${base}/bank-connections/c%3F1/refresh`,
    ]);
  });

  it("encodes accountId in savings and pension", async () => {
    expect(await run(savingsAction, { intent: "deleteAccount", accountId: "s/1" })).toEqual([
      `${base}/accounts/s%2F1`,
    ]);
    expect(await run(pensionAction, { intent: "deletePensionAccount", accountId: "p/1" })).toEqual([
      `${base}/accounts/p%2F1`,
    ]);
  });

  it("encodes record ids in tax deletes", async () => {
    expect(await run(taxAction, { intent: "delete-transaction", id: "t/1" })).toEqual([
      `${base}/tax-records/t%2F1`,
    ]);
    expect(
      await run(taxAction, {
        intent: "delete-tax-year",
        recordIds: JSON.stringify(["a/1", "b?2"]),
      }),
    ).toEqual([`${base}/tax-records/a%2F1`, `${base}/tax-records/b%3F2`]);
    expect(await run(taxAction, { intent: "update-transaction", id: "t/1" })).toEqual([
      `${base}/tax-records/t%2F1`,
    ]);
  });
});
