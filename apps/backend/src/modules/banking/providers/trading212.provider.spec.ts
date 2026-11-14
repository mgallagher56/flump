import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeBank, type FakeBank, json } from "./__fixtures__/fake-bank";
import { trading212Case } from "./__fixtures__/provider-cases";
import { Trading212Provider } from "./trading212.provider";

// Failure modes are covered for every provider in provider-failure-modes.spec.ts; this file
// checks Trading 212 mapping.
describe("Trading212Provider", () => {
  let bank: FakeBank;
  const provider = new Trading212Provider();

  beforeEach(() => {
    bank = createFakeBank(trading212Case.routes);
    vi.stubGlobal("fetch", bank.fetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("generates the auth url", () => {
    const authUrl = provider.getAuthUrl("client_123", "http://localhost/cb", "state_abc");
    expect(authUrl).toContain("https://live.trading212.com/oauth/authorize");
    expect(authUrl).toContain("client_id=client_123");
    expect(authUrl).toContain("state=state_abc");
  });

  it("never falls back to a placeholder account id (it would duplicate the account)", async () => {
    bank.failAlways("info", json({ currencyCode: "GBP" }));
    await expect(provider.fetchAccounts("key")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  it("does not use the invested figure when the total is missing", async () => {
    bank.failAlways("cash", json({ invested: 900 }));
    await expect(provider.fetchAccounts("key")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  it("a filled order without a quantity is malformed, not guessed", async () => {
    bank.failAlways(
      "transactions",
      json({
        items: [
          {
            status: "FILLED",
            type: "MARKET",
            filledValue: 5,
            dateExecuted: "2026-11-01T00:00:00Z",
          },
        ],
      }),
    );
    await expect(provider.fetchTransactions("key", "t212-1")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  it("accepts orders as a bare array", async () => {
    bank.failAlways(
      "transactions",
      json([
        {
          status: "FILLED",
          type: "LIMIT",
          filledQuantity: -1,
          filledValue: 10,
          ticker: "X",
          dateExecuted: "2026-11-01T00:00:00Z",
        },
      ]),
    );
    await expect(provider.fetchTransactions("key", "t212-1")).resolves.toEqual([
      {
        amount: 10,
        description: "Sold X",
        category: "Investment",
        timestamp: new Date("2026-11-01T00:00:00Z"),
      },
    ]);
  });
});
