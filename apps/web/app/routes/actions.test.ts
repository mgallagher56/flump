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
vi.mock("~/i18n.server", () => ({ default: { getLocale: vi.fn().mockResolvedValue("en") } }));

import { BankSyncOrchestrator } from "@flump/banking/server";
import { apiConfig } from "~/config.server";
import { action as accountsAction } from "./app.accounts._index";
import { action as accountAction } from "./app.accounts.$account";
import { action as onboardingAction } from "./app.onboarding";
import { action as pensionAction } from "./app.pension";
import { action as savingsAction } from "./app.savings";
import { action as taxAction } from "./app.tax";

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
    route: "account detail",
    action: accountAction,
    intent: "deleteYear",
    fields: { year: "2024" },
    params: { account: "a1" },
    method: "DELETE",
    path: "/accounts/a1/details/2024",
  },
  {
    route: "account detail",
    action: accountAction,
    intent: "addYear",
    fields: { year: "2025" },
    params: { account: "a1" },
    method: "POST",
    path: "/accounts/a1/details/year",
    body: { year: 2025 },
  },
  {
    route: "account detail",
    action: accountAction,
    intent: "updateValues",
    fields: { values: JSON.stringify([{ month: 1, balance: 5 }]) },
    params: { account: "a1" },
    method: "PUT",
    path: "/accounts/a1/details",
    body: { values: [{ month: 1, balance: 5 }] },
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
      interestRate: 5,
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
    fields: { annualSalary: "50000.5" },
    method: "PATCH",
    path: "/user-profile",
    body: { annualSalary: 50000.5, propertyOwnershipShare: 100 },
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
      receiptData: null,
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
  const form = new FormData();
  form.set("intent", c.intent);
  for (const [k, v] of Object.entries(c.fields)) form.set(k, v);
  return {
    request: new Request("http://localhost/app", { method: "POST", body: form }),
    params: c.params ?? {},
    context: {},
  };
};

const respond = (status: number, body: unknown = {}) =>
  vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getAuthSession.mockResolvedValue({ user: { id: "u1" }, accessToken: "tok" });
});

describe.each(cases)("$route action, intent $intent", (c) => {
  it("calls the backend with the expected method, URL, auth and body", async () => {
    const fetchMock = respond(200, { success: true });
    globalThis.fetch = fetchMock;
    const res: any = await c.action(makeArgs(c));
    expect(res.data).toMatchObject({ success: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiConfig.apiBaseUrl}${c.path}`);
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

describe("accounts action, connectBank", () => {
  it("still resolves an OAuth redirect when the backend call fails", async () => {
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
    // The failed backend call is tolerated; with no provider URL available it falls through.
    expect(res.data).toEqual({ success: true });
    expect(res.init?.status).toBeUndefined();
  });

  it("returns the backend redirect URL for OAuth", async () => {
    globalThis.fetch = respond(200, { oauth: true, redirectUrl: "https://bank.example/auth" });
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

describe("pension wizard", () => {
  const wizard = cases.find((c) => c.intent === "completePensionWizard") as Case;

  it("runs account, profile then checklist, and stops at the first failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
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
    expect(url).toBe(`${apiConfig.apiBaseUrl}/user-profile/checklist`);
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
    expect(url).toBe(`${apiConfig.apiBaseUrl}/user-profile`);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      enabledPages: ["accounts", "budget"],
      dashboardWidgets: ["accounts", "budget"],
      dashboardWidgetOrder: ["accounts", "budget"],
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
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 503 }));
    const res: any = await pensionAction(makeArgs(wizard));
    expect(res.data).toEqual({ success: true });
  });

  it("an auth redirect thrown inside the try block propagates", async () => {
    const redirectResponse = new Response(null, { status: 302, headers: { Location: "/login" } });
    vi.spyOn(BankSyncOrchestrator, "getOAuthUrl").mockImplementation(() => {
      throw redirectResponse;
    });
    globalThis.fetch = respond(200, {});
    const form = new FormData();
    form.set("intent", "connectBank");
    form.set("institutionId", "inst");
    form.set("authType", "oauth");
    await expect(
      accountsAction({
        request: new Request("http://localhost/app", { method: "POST", body: form }),
        params: {},
        context: {},
      } as any),
    ).rejects.toBe(redirectResponse);
  });
});
