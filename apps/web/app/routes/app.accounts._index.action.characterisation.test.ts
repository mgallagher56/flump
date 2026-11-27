// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Characterisation of the accounts list action's request bodies (E12 S8, S5 method), written
 * against the action before the body decision moved into `@flump/finance-engine/account-form` and
 * kept unchanged after. Each expected body is worked out by hand in the comments.
 */

// The global test setup stubs parts of react-router; the action needs the real `data`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const backendFetch = vi.fn();
vi.mock("~/services/backend-client.server", () => ({
  loadWorkspacePicture: vi.fn(),
  backendFetch: (...a: unknown[]) => backendFetch(...a),
  backendFetchAll: vi.fn(),
}));
vi.mock("~/utils/auth.server", () => ({
  getAuthSession: async () => ({ user: { id: "u1" }, accessToken: "token" }),
  requireAccessToken: ({ accessToken }: { accessToken: string }) => accessToken,
}));

const { action } = await import("./app.accounts._index");

const post = (fields: Record<string, string>) =>
  action({
    request: new Request("http://app.test/app/accounts", {
      method: "POST",
      body: new URLSearchParams(fields),
    }),
    params: {},
  } as never) as unknown as Promise<{ data: unknown }>;

const call = (n = 0) => backendFetch.mock.calls[n] as [string, Record<string, unknown>];

beforeEach(() => {
  backendFetch.mockReset();
  backendFetch.mockResolvedValue({ id: "new1" });
});

describe("create", () => {
  it("posts the name, type and the fields read back", async () => {
    await post({
      intent: "create",
      requestId: "r1",
      name: "Card",
      type: "Credit Card",
      ownership: "sole",
      balance: "-250.556",
      creditLimit: "",
      promoZeroPercentUntil: "",
    });
    expect(backendFetch).toHaveBeenCalledTimes(1);
    const [endpoint, options] = call();
    expect(endpoint).toBe("/accounts");
    expect(options.method).toBe("POST");
    expect(options.idempotencyKey).toBe("r1:account");
    // Sole sends sharePercent null; -250.556 to 2 dp is -250.56 (-25055.6 rounds to -25056, over
    // 100); empty credit fields are null (cleared).
    expect(options.body).toEqual({
      name: "Card",
      type: "Credit Card",
      ownership: "sole",
      sharePercent: null,
      balance: -250.56,
      creditLimit: null,
      promoZeroPercentUntil: null,
    });
  });

  it("a mortgage with a home value and no link adds both through the pair route", async () => {
    await post({
      intent: "create",
      requestId: "r2",
      name: "Mortgage",
      type: "Mortgage",
      ownership: "joint",
      sharePercent: "40",
      accountSubtype: "",
      balance: "-200000",
      homeValue: "250000.126",
    });
    const [endpoint, options] = call();
    expect(endpoint).toBe("/accounts/mortgage-with-property");
    expect(options.idempotencyKey).toBe("r2:mortgage");
    // The mortgage carries no type (the route knows it); 250000.126 to 2 dp is 250000.13.
    expect(options.body).toEqual({
      mortgage: {
        name: "Mortgage",
        ownership: "joint",
        sharePercent: 40,
        accountSubtype: null,
        balance: -200000,
      },
      property: { balance: 250000.13 },
    });
  });

  it("a mortgage with a home value but linked to a property is added alone", async () => {
    await post({
      intent: "create",
      name: "Mortgage",
      type: "Mortgage",
      ownership: "sole",
      linkedAccountId: "h1",
      homeValue: "250000",
    });
    const [endpoint, options] = call();
    expect(endpoint).toBe("/accounts");
    // No requestId posted, so no idempotency key.
    expect(options.idempotencyKey).toBeUndefined();
    expect(options.body).toEqual({
      name: "Mortgage",
      type: "Mortgage",
      ownership: "sole",
      sharePercent: null,
      linkedAccountId: "h1",
    });
  });

  it.each(["0", "-5", "abc"])("a home value of %s is no home value", async (homeValue) => {
    await post({ intent: "create", name: "M", type: "Mortgage", homeValue });
    expect(call()[0]).toBe("/accounts");
    expect(call()[1].body).toEqual({ name: "M", type: "Mortgage" });
  });

  it("a home value on anything but a mortgage is ignored", async () => {
    await post({ intent: "create", name: "Loan", type: "Loan", homeValue: "1000" });
    expect(call()[0]).toBe("/accounts");
    expect(call()[1].body).toEqual({ name: "Loan", type: "Loan" });
  });

  it("a property added for a mortgage links the mortgage to it after", async () => {
    await post({
      intent: "create",
      name: "Home (your estimate)",
      type: "Property",
      accountSubtype: "home",
      balance: "300000",
      linkMortgageId: "m1",
      linkMortgageVersion: "2026-01-05T10:00:00.000Z",
    });
    expect(call(0)[1].body).toEqual({
      name: "Home (your estimate)",
      type: "Property",
      accountSubtype: "home",
      balance: 300000,
    });
    expect(call(1)[0]).toBe("/accounts/m1");
    expect(call(1)[1]).toMatchObject({ method: "PATCH", body: { linkedAccountId: "new1" } });
  });
});

describe("update", () => {
  it("sends the name and type only when posted", async () => {
    await post({ intent: "update", accountId: "a1", name: "Pot", type: "Saving", balance: "10" });
    expect(call()).toEqual([
      "/accounts/a1",
      expect.objectContaining({
        method: "PATCH",
        body: { name: "Pot", type: "Saving", balance: 10 },
      }),
    ]);
  });

  it("an update with nothing changed still patches, with an empty body", async () => {
    await post({ intent: "update", accountId: "a1" });
    expect(call()).toEqual([
      "/accounts/a1",
      expect.objectContaining({ method: "PATCH", body: {} }),
    ]);
  });

  it("an empty name is still sent as posted", async () => {
    await post({ intent: "update", accountId: "a1", name: "" });
    expect(call()[1].body).toEqual({ name: "" });
  });
});
