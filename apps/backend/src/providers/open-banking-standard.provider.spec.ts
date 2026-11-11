import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OPEN_BANKING_INSTITUTIONS,
  OpenBankingStandardProvider,
} from "./open-banking-standard.provider";

describe("OpenBankingStandardProvider", () => {
  let hsbcProvider: OpenBankingStandardProvider;

  beforeEach(() => {
    hsbcProvider = new OpenBankingStandardProvider(OPEN_BANKING_INSTITUTIONS.hsbc);
    vi.restoreAllMocks();
  });

  it("should generate correct authorization URL for HSBC", () => {
    const authUrl = hsbcProvider.getAuthUrl("hsbc_id", "http://localhost/cb", "state_123");
    expect(authUrl).toContain("https://api.hsbc.com/oauth/v1/authorize");
    expect(authUrl).toContain("client_id=hsbc_id");
    expect(authUrl).toContain("scope=openid+accounts");
  });

  it("exchanges code and handles errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "ob_acc",
          refresh_token: "ob_ref",
          expires_in: 3600,
        }),
    });
    const res = await hsbcProvider.exchangeCode("id", "sec", "http://cb", "code");
    expect(res).toEqual({
      accessToken: "ob_acc",
      refreshToken: "ob_ref",
      expiresIn: 3600,
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("invalid_client"),
    });
    await expect(hsbcProvider.exchangeCode("id", "sec", "http://cb", "bad")).rejects.toThrow(
      "HSBC Bank token exchange failed: invalid_client",
    );
  });

  it("should fetch accounts and balances across subtypes from OBIE v3.1 endpoints", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/accounts")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Data: {
                Account: [
                  {
                    AccountId: "acc-1",
                    Currency: "GBP",
                    AccountSubType: "CurrentAccount",
                    Nickname: "Premier Current",
                  },
                  {
                    id: "acc-2",
                    AccountSubType: "Savings",
                    name: "ISA Saver",
                  },
                  {
                    account_id: "acc-3",
                    type: "Mortgage",
                  },
                  {
                    AccountId: "acc-4",
                    AccountSubType: "CreditCard",
                  },
                  {
                    AccountId: "acc-5",
                    AccountSubType: "WealthInvestment",
                  },
                ],
              },
            }),
        });
      }
      if (url.includes("/acc-1/balances")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Data: {
                Balance: [{ Amount: { Amount: "3450.75", Currency: "GBP" } }],
              },
            }),
        });
      }
      return Promise.reject(new Error("Balance fail"));
    });

    const accounts = await hsbcProvider.fetchAccounts("hsbc-token");
    expect(accounts).toHaveLength(5);
    expect(accounts[0].type).toBe("Current");
    expect(accounts[0].balance).toBe(3450.75);
    expect(accounts[1].type).toBe("Saving");
    expect(accounts[2].type).toBe("Mortgage");
    expect(accounts[3].type).toBe("Credit Card");
    expect(accounts[4].type).toBe("Investment");
  });

  it("throws when accounts endpoint fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("forbidden"),
    });
    await expect(hsbcProvider.fetchAccounts("Bearer tok")).rejects.toThrow(
      "Failed to fetch HSBC Bank accounts: forbidden",
    );
  });

  it("fetches and maps transactions", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
    expect(await hsbcProvider.fetchTransactions("tok", "hsbc-acc-1")).toEqual([]);

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("err"));
    expect(await hsbcProvider.fetchTransactions("tok", "hsbc-acc-1")).toEqual([]);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          Data: {
            Transaction: [
              {
                Amount: { Amount: "45.50" },
                CreditDebitIndicator: "Debit",
                TransactionInformation: "Coffee Shop",
                ProprietaryBankTransactionCode: { Code: "Food" },
                BookingDateTime: "2026-01-10T10:00:00Z",
              },
              {
                amount: 1200,
                CreditDebitIndicator: "Credit",
              },
            ],
          },
        }),
    });

    const txs = await hsbcProvider.fetchTransactions("Bearer tok", "hsbc-acc-1");
    expect(txs).toHaveLength(2);
    expect(txs[0].amount).toBe(-45.5);
    expect(txs[0].description).toBe("Coffee Shop");
    expect(txs[0].category).toBe("Food");
    expect(txs[1].amount).toBe(1200);
    expect(txs[1].description).toBe("Open Banking Transaction");
  });
});
