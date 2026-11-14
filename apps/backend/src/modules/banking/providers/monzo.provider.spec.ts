import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeBank, type FakeBank, json } from "./__fixtures__/fake-bank";
import { monzoCase } from "./__fixtures__/provider-cases";
import { MonzoProvider } from "./monzo.provider";

// Failure modes (429, timeout, 5xx, revoked consent, malformed bodies) are covered for every
// provider in provider-failure-modes.spec.ts; this file checks Monzo-specific mapping.
describe("MonzoProvider", () => {
  let bank: FakeBank;
  const provider = new MonzoProvider();

  beforeEach(() => {
    bank = createFakeBank(monzoCase.routes);
    vi.stubGlobal("fetch", bank.fetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("generates correct auth url", () => {
    const url = provider.getAuthUrl("client_1", "http://localhost/cb", "state_1");
    expect(url).toContain("https://auth.monzo.com/?");
    expect(url).toContain("client_id=client_1");
    expect(url).toContain("state=state_1");
  });

  it("skips closed accounts and deleted pots, and never calls them", async () => {
    const accounts = await provider.fetchAccounts("tok");
    expect(accounts.map((a) => a.externalAccountId)).toEqual(["acc_1", "pot_1", "acc_joint"]);
    expect(bank.calls.some((c) => c.url.includes("acc_closed"))).toBe(false);
  });

  it("sends the bearer token on every call", async () => {
    await provider.fetchAccounts("tok");
    expect(bank.calls.every((c) => c.headers.Authorization === "Bearer tok")).toBe(true);
  });

  it("rejects a fractional minor-unit balance as malformed", async () => {
    bank.failAlways("balance", json({ balance: 10.5, currency: "GBP" }));
    await expect(provider.fetchAccounts("tok")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  it("fetches pots only for retail current accounts", async () => {
    bank.failAlways(
      "accounts",
      json({ accounts: [{ id: "acc_1", type: "uk_prepaid", closed: false }] }),
    );
    const accounts = await provider.fetchAccounts("tok");
    expect(accounts.map((a) => a.externalAccountId)).toEqual(["acc_1"]);
    expect(bank.callsTo("pots")).toHaveLength(0);
  });

  it("returns no transactions for a pot without calling the API", async () => {
    await expect(provider.fetchTransactions("tok", "pot_1")).resolves.toEqual([]);
    expect(bank.calls).toHaveLength(0);
  });

  it("requests 30 transactions unless told otherwise", async () => {
    bank.failAlways("transactions", json({ transactions: [] }));
    await expect(provider.fetchTransactions("tok", "acc_1")).resolves.toEqual([]);
    expect(bank.callsTo("transactions")[0]?.url).toContain("limit=30");
  });

  it("passes a custom transaction limit", async () => {
    const limited = createFakeBank([
      {
        key: "tx",
        path: /\/transactions\?account_id=acc_1&limit=5$/,
        respond: json({ transactions: [] }),
      },
    ]);
    vi.stubGlobal("fetch", limited.fetch);
    await expect(provider.fetchTransactions("tok", "acc_1", { limit: 5 })).resolves.toEqual([]);
    expect(limited.unmatched).toEqual([]);
  });
});
