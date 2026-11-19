import { beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; actions need the real `data`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const getAuthSession = vi.fn();
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: (...a: unknown[]) => getAuthSession(...a),
  authHeader: ({ accessToken }: { accessToken?: string }) => ({
    Authorization: `Bearer ${accessToken}`,
  }),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));

import { apiConfig } from "~/config.server";
import { CONFLICT_MESSAGE, PROFILE_VERSION_FIELD, VERSION_FIELD } from "~/services/conflict";
import { contractFetch } from "~/test/fixtures/contractResponses";
import * as accountsRoute from "./app.accounts._index";
import * as debtRoute from "./app.debt";
import * as onboardingRoute from "./app.onboarding";
import * as pensionRoute from "./app.pension";
import * as savingsRoute from "./app.savings";
import * as taxRoute from "./app.self-assessment";

type Action = (args: any) => Promise<any>;

const UPDATED_AT = "2026-11-14T09:30:00.123Z";
const ETAG = `"${UPDATED_AT}"`;
const ID = "6f1c1f3e-9d6e-4c0e-9f43-0a1b2c3d4e5f";

interface Case {
  name: string;
  action: Action;
  shouldRevalidate?: unknown;
  fields: Record<string, string>;
  /** The form field that carries the version of the record this intent edits. */
  versionField: string;
  path: string;
}

/**
 * Every server action that edits a saved record (BE-16, audit M7): accounts from the accounts,
 * debt, savings and pension pages, tax records, and the profile fields the tax page saves.
 */
const cases: Case[] = [
  {
    name: "accounts: update",
    action: accountsRoute.action,
    shouldRevalidate: accountsRoute.shouldRevalidate,
    fields: { intent: "update", accountId: ID, name: "Saver", type: "Saving", balance: "120" },
    versionField: VERSION_FIELD,
    path: `/accounts/${ID}`,
  },
  {
    name: "debt: updateDebt",
    action: debtRoute.action,
    shouldRevalidate: debtRoute.shouldRevalidate,
    fields: { intent: "updateDebt", accountId: ID, name: "Barclaycard", interestRate: "19.9" },
    versionField: VERSION_FIELD,
    path: `/accounts/${ID}`,
  },
  {
    name: "savings: updateSavingsAccount",
    action: savingsRoute.action,
    shouldRevalidate: savingsRoute.shouldRevalidate,
    fields: { intent: "updateSavingsAccount", accountId: ID, name: "ISA", balance: "500" },
    versionField: VERSION_FIELD,
    path: `/accounts/${ID}`,
  },
  {
    name: "pension: updatePensionAccount",
    action: pensionRoute.action,
    shouldRevalidate: pensionRoute.shouldRevalidate,
    fields: { intent: "updatePensionAccount", accountId: ID, name: "Pot", balance: "9000" },
    versionField: VERSION_FIELD,
    path: `/accounts/${ID}`,
  },
  {
    name: "tax records: update-transaction",
    action: taxRoute.action,
    shouldRevalidate: taxRoute.shouldRevalidate,
    fields: {
      intent: "update-transaction",
      id: ID,
      name: "Invoice",
      source: "self-employed",
      type: "income",
      category: "self_employed_income",
      amount: "1200",
      date: "2026-05-01",
      frequency: "one-off",
    },
    versionField: VERSION_FIELD,
    path: `/tax-records/${ID}`,
  },
  {
    name: "tax page profile: update-profile",
    action: taxRoute.action,
    shouldRevalidate: taxRoute.shouldRevalidate,
    fields: { intent: "update-profile", annualSalary: "42000", propertyOwnershipShare: "100" },
    versionField: PROFILE_VERSION_FIELD,
    path: "/user-profile",
  },
  {
    name: "onboarding: profile",
    action: onboardingRoute.action,
    fields: { enabledPages: JSON.stringify(["budget"]) },
    versionField: PROFILE_VERSION_FIELD,
    path: "/user-profile",
  },
];

const makeArgs = (fields: Record<string, string>): any => {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return {
    request: new Request("http://localhost/app", { method: "POST", body: form }),
    params: {},
    context: {},
  };
};

const respond = (status: number) =>
  vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
    status < 300
      ? contractFetch(status)(input, init)
      : new Response(JSON.stringify({ code: "precondition_failed", message: "backend text" }), {
          status,
        }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getAuthSession.mockResolvedValue({ user: { id: "u1" }, accessToken: "tok" });
});

describe.each(cases)("conditional write, $name", (c) => {
  it("sends the version the form loaded as If-Match", async () => {
    const fetchMock = respond(200);
    globalThis.fetch = fetchMock;
    await c.action(makeArgs({ ...c.fields, [c.versionField]: UPDATED_AT }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${apiConfig.apiBaseUrl}/v1${c.path}`);
    expect(init.method).toBe("PATCH");
    expect(init.headers["If-Match"]).toBe(ETAG);
    // The version is a header only: it never reaches the strict request body.
    expect(init.body).not.toContain(UPDATED_AT);
  });

  it("sends no If-Match when the form carries no version, or one that is not a date", async () => {
    for (const version of [undefined, "junk"]) {
      const fetchMock = respond(200);
      globalThis.fetch = fetchMock;
      await c.action(
        makeArgs(version === undefined ? c.fields : { ...c.fields, [c.versionField]: version }),
      );
      expect(fetchMock.mock.calls[0][1].headers["If-Match"]).toBeUndefined();
    }
  });

  it("answers a 412 with the conflict message and status, once, with no backend text", async () => {
    const fetchMock = respond(412);
    globalThis.fetch = fetchMock;
    const res: any = await c.action(makeArgs({ ...c.fields, [c.versionField]: UPDATED_AT }));
    expect(res.init.status).toBe(412);
    expect(res.data).toEqual({ success: false, conflict: true, error: CONFLICT_MESSAGE });
    expect(JSON.stringify(res.data)).not.toMatch(/backend text|tok|localhost|http/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reloads the route's saved data after a 412", () => {
    if (c.shouldRevalidate === undefined) return;
    const shouldRevalidate = c.shouldRevalidate as (args: unknown) => boolean;
    expect(shouldRevalidate({ actionStatus: 412, defaultShouldRevalidate: false })).toBe(true);
    expect(shouldRevalidate({ actionStatus: 400, defaultShouldRevalidate: false })).toBe(false);
  });
});
