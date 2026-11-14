import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeBank, type FakeBank, json } from "./__fixtures__/fake-bank";
import { openBankingCase } from "./__fixtures__/provider-cases";
import {
  OPEN_BANKING_INSTITUTIONS,
  OpenBankingStandardProvider,
} from "./open-banking-standard.provider";

// Failure modes are covered for every provider in provider-failure-modes.spec.ts; this file
// checks Open Banking mapping.
describe("OpenBankingStandardProvider", () => {
  let bank: FakeBank;
  const hsbc = new OpenBankingStandardProvider(OPEN_BANKING_INSTITUTIONS.hsbc as never);

  beforeEach(() => {
    bank = createFakeBank(openBankingCase.routes);
    vi.stubGlobal("fetch", bank.fetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("generates the authorisation URL", () => {
    const authUrl = hsbc.getAuthUrl("hsbc_id", "http://localhost/cb", "state_123");
    expect(authUrl).toContain("https://api.hsbc.com/oauth/v1/authorize");
    expect(authUrl).toContain("client_id=hsbc_id");
    expect(authUrl).toContain("scope=openid+accounts");
  });

  it.each([
    ["Savings", "Saving"],
    ["CashISA", "Saving"],
    ["Mortgage", "Mortgage"],
    ["CreditCard", "Credit Card"],
    ["Investment", "Investment"],
    ["Wealth", "Investment"],
    ["CurrentAccount", "Current"],
  ])("maps sub-type %s to %s", async (subType, type) => {
    bank.failAlways(
      "accounts",
      json({ Data: { Account: [{ AccountId: "111", AccountSubType: subType }] } }),
    );
    const [account] = await hsbc.fetchAccounts("tok");
    expect(account?.type).toBe(type);
  });

  it("prefers the booked balance whatever order the types come in", async () => {
    bank.failAlways(
      "balance",
      json({
        Data: {
          Balance: [
            {
              Type: "InterimAvailable",
              Amount: { Amount: "900.00" },
              CreditDebitIndicator: "Credit",
            },
            { Type: "InterimBooked", Amount: { Amount: "750.00" }, CreditDebitIndicator: "Credit" },
          ],
        },
      }),
    );
    const [account] = await hsbc.fetchAccounts("tok");
    expect(account?.balance).toBe(750);
  });

  it("rejects an empty balance list", async () => {
    bank.failAlways("balance", json({ Data: { Balance: [] } }));
    await expect(hsbc.fetchAccounts("tok")).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });

  it("reads Revolut's inline balance without a balances call", async () => {
    const revolutBank = createFakeBank([
      {
        key: "accounts",
        path: /^https:\/\/b2b\.revolut\.com\/api\/1\.0\/accounts$/,
        respond: json([{ id: "r-1", name: "Main", balance: 321.5, currency: "GBP" }]),
      },
    ]);
    vi.stubGlobal("fetch", revolutBank.fetch);
    const revolut = new OpenBankingStandardProvider(OPEN_BANKING_INSTITUTIONS.revolut as never);
    await expect(revolut.fetchAccounts("tok")).resolves.toEqual([
      {
        externalAccountId: "revolut-r-1",
        name: "Revolut Main",
        type: "Current",
        balance: 321.5,
        currency: "GBP",
      },
    ]);
    expect(revolutBank.unmatched).toEqual([]);

    revolutBank.failAlways("accounts", json([{ id: "r-1", name: "Main" }]));
    await expect(revolut.fetchAccounts("tok")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  it("rejects a dot-segment account id instead of putting it in the path", async () => {
    bank.failAlways("accounts", json({ Data: { Account: [{ AccountId: ".." }] } }));
    await expect(hsbc.fetchAccounts("tok")).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
    expect(bank.calls).toHaveLength(1);
  });

  it("does not double the Bearer prefix", async () => {
    await hsbc.fetchAccounts("Bearer tok");
    expect(bank.calls.every((c) => c.headers.Authorization === "Bearer tok")).toBe(true);
  });

  it("accepts a bare array of accounts and an unsigned amount without an indicator", async () => {
    bank.failAlways("accounts", json([{ id: "111", name: "Main", type: "current" }]));
    bank.failAlways("balance", json({ balances: [{ amount: -42.1 }] }));
    const [account] = await hsbc.fetchAccounts("tok");
    expect(account).toMatchObject({ externalAccountId: "hsbc-111", balance: -42.1 });
  });

  it("rejects an unknown credit/debit indicator", async () => {
    bank.failAlways(
      "balance",
      json({
        Data: { Balance: [{ Amount: { Amount: "1.00" }, CreditDebitIndicator: "Sideways" }] },
      }),
    );
    await expect(hsbc.fetchAccounts("tok")).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });

  it("rejects a transaction without a booking date", async () => {
    bank.failAlways(
      "transactions",
      json({ Data: { Transaction: [{ Amount: { Amount: "1.00" } }] } }),
    );
    await expect(hsbc.fetchTransactions("tok", "hsbc-111")).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });
});
