import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StarlingProvider } from "./starling.provider";

describe("StarlingProvider", () => {
  let configService: ConfigService;
  let provider: StarlingProvider;

  beforeEach(() => {
    configService = {
      get: vi.fn().mockReturnValue("false"),
    } as unknown as ConfigService;
    provider = new StarlingProvider(configService);
    vi.restoreAllMocks();
  });

  it("generates production and sandbox auth urls", () => {
    vi.spyOn(configService, "get").mockReturnValue("false");
    const prodUrl = provider.getAuthUrl("cid", "http://cb", "st");
    expect(prodUrl).toContain("https://oauth.starlingbank.com/?");

    vi.spyOn(configService, "get").mockReturnValue("true");
    const sbUrl = provider.getAuthUrl("cid", "http://cb", "st");
    expect(sbUrl).toContain("https://oauth-sandbox.starlingbank.com/?");
  });

  it("exchanges code and handles error", async () => {
    vi.spyOn(configService, "get").mockReturnValue("true");
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "st_acc",
          refresh_token: "st_ref",
          expires_in: 7200,
        }),
    });

    const res = await provider.exchangeCode("id", "sec", "http://cb", "code");
    expect(res).toEqual({
      accessToken: "st_acc",
      refreshToken: "st_ref",
      expiresIn: 7200,
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("invalid_grant"),
    });
    await expect(provider.exchangeCode("id", "sec", "http://cb", "bad")).rejects.toThrow(
      "Starling token exchange failed: invalid_grant",
    );
  });

  it("fetches accounts and savings spaces across account types", async () => {
    vi.spyOn(configService, "get").mockReturnValue("false");
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/api/v2/accounts")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [
                {
                  accountUid: "u1",
                  defaultCategory: "c1",
                  accountType: "PRIMARY",
                  currency: "GBP",
                },
                {
                  accountUid: "u2",
                  defaultCategory: "c2",
                  accountType: "JOINT",
                },
                {
                  accountUid: "u3",
                  defaultCategory: "c3",
                  accountType: "SOLE_TRADER",
                },
              ],
            }),
        });
      }
      if (url.includes("/accounts/u1/balance")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ effectiveBalance: { minorUnits: 250000 } }),
        });
      }
      if (url.includes("/accounts/u2/balance")) {
        return Promise.reject(new Error("fail"));
      }
      if (url.includes("/accounts/u3/balance")) {
        return Promise.resolve({ ok: false });
      }
      if (url.includes("/sub-accounts/u1/savings-goals")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              savingsGoals: [
                {
                  savingsGoalUid: "g1",
                  name: "Rainy Day",
                  totalSaved: { minorUnits: 80000, currency: "GBP" },
                },
              ],
            }),
        });
      }
      if (url.includes("/sub-accounts/u2/savings-goals")) {
        return Promise.reject(new Error("spaces fail"));
      }
      if (url.includes("/sub-accounts/u3/savings-goals")) {
        return Promise.resolve({ ok: false });
      }
      return Promise.reject(new Error("unknown"));
    });

    const accounts = await provider.fetchAccounts("tok");
    expect(accounts).toHaveLength(4);
    expect(accounts[0].name).toBe("Starling Current Account");
    expect(accounts[0].balance).toBe(2500);
    expect(accounts[1].name).toBe("Starling Joint Account");
    expect(accounts[2].name).toBe("Starling Sole Trader Account");
    expect(accounts[3]).toEqual({
      externalAccountId: "space:u1:g1",
      name: "Starling Saving: Rainy Day",
      type: "Saving",
      balance: 800,
      currency: "GBP",
    });
  });

  it("throws when accounts endpoint fails", async () => {
    vi.spyOn(configService, "get").mockReturnValue("false");
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("denied"),
    });
    await expect(provider.fetchAccounts("tok")).rejects.toThrow(
      "Failed to fetch Starling accounts: denied",
    );
  });

  it("fetches and maps transactions", async () => {
    vi.spyOn(configService, "get").mockReturnValue("false");

    // Space accounts return empty
    expect(await provider.fetchTransactions("tok", "space:u1:g1")).toEqual([]);
    // Malformed id returns empty
    expect(await provider.fetchTransactions("tok", "invalid")).toEqual([]);

    // Non-ok response returns empty
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
    expect(await provider.fetchTransactions("tok", "u1:c1")).toEqual([]);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          feedItems: [
            {
              direction: "OUT",
              amount: { minorUnits: 1250 },
              spendingCategory: "GROCERIES",
              counterPartyName: "Waitrose",
              transactionTime: "2026-01-01T12:00:00Z",
            },
            {
              direction: "OUT",
              amount: { minorUnits: 4000 },
              spendingCategory: "UTILITIES",
              reference: "Octopus Energy",
              transactionTime: "2026-01-02T12:00:00Z",
            },
            {
              direction: "IN",
              amount: { minorUnits: 250000 },
              spendingCategory: "INCOME",
              counterPartyName: "ACME Ltd",
              transactionTime: "2026-01-03T12:00:00Z",
            },
            {
              direction: "OUT",
              amount: { minorUnits: 300 },
              spendingCategory: "TRANSPORT",
              transactionTime: "2026-01-04T12:00:00Z",
            },
            {
              direction: "OUT",
              amount: { minorUnits: 5000 },
              spendingCategory: "SHOPPING",
              transactionTime: "2026-01-05T12:00:00Z",
            },
            {
              direction: "OUT",
              amount: { minorUnits: 999 },
              spendingCategory: "OTHER",
              transactionTime: "2026-01-06T12:00:00Z",
            },
          ],
        }),
    });

    const txs = await provider.fetchTransactions("tok", "u1:c1");
    expect(txs).toHaveLength(6);
    expect(txs[0].amount).toBe(-12.5);
    expect(txs[0].category).toBe("Food");
    expect(txs[1].category).toBe("Utilities");
    expect(txs[2].amount).toBe(2500);
    expect(txs[2].category).toBe("Salary");
    expect(txs[3].category).toBe("Transport");
    expect(txs[4].category).toBe("Shopping");
    expect(txs[5].category).toBe("General");
  });
});
