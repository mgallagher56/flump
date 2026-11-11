import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonzoProvider } from "./monzo.provider";

describe("MonzoProvider", () => {
  let provider: MonzoProvider;

  beforeEach(() => {
    provider = new MonzoProvider();
    vi.restoreAllMocks();
  });

  it("generates correct auth url", () => {
    const url = provider.getAuthUrl("client_1", "http://localhost/cb", "state_1");
    expect(url).toContain("https://auth.monzo.com/?");
    expect(url).toContain("client_id=client_1");
    expect(url).toContain("state=state_1");
  });

  it("exchanges code for token and handles failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "acc_tok",
          refresh_token: "ref_tok",
          expires_in: 3600,
        }),
    });

    const token = await provider.exchangeCode("id", "secret", "http://cb", "code123");
    expect(token).toEqual({
      accessToken: "acc_tok",
      refreshToken: "ref_tok",
      expiresIn: 3600,
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("bad_code"),
    });

    await expect(provider.exchangeCode("id", "secret", "http://cb", "bad")).rejects.toThrow(
      "Monzo token exchange failed: bad_code",
    );
  });

  it("fetches accounts and pots, skipping closed accounts and deleted pots", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "https://api.monzo.com/accounts") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [
                { id: "acc_closed", closed: true, type: "uk_retail" },
                { id: "acc_1", closed: false, type: "uk_retail" },
                { id: "acc_2", closed: false, type: "uk_retail_joint" },
              ],
            }),
        });
      }
      if (url.includes("/balance?account_id=acc_1")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ balance: 150050, currency: "GBP" }),
        });
      }
      if (url.includes("/balance?account_id=acc_2")) {
        return Promise.reject(new Error("network error"));
      }
      if (url.includes("/pots?current_account_id=acc_1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              pots: [
                { id: "pot_del", name: "Old", deleted: true, balance: 100 },
                { id: "pot_1", name: "Holiday", deleted: false, balance: 50000, currency: "GBP" },
              ],
            }),
        });
      }
      if (url.includes("/pots?current_account_id=acc_2")) {
        return Promise.reject(new Error("pots error"));
      }
      return Promise.reject(new Error("Unknown"));
    });

    const accounts = await provider.fetchAccounts("tok");
    expect(accounts).toHaveLength(3);
    expect(accounts[0]).toEqual({
      externalAccountId: "acc_1",
      name: "Monzo Current Account",
      type: "Current",
      balance: 1500.5,
      currency: "GBP",
    });
    expect(accounts[1]).toEqual({
      externalAccountId: "pot_1",
      name: "Monzo Pot: Holiday",
      type: "Saving",
      balance: 500,
      currency: "GBP",
    });
    expect(accounts[2]).toEqual({
      externalAccountId: "acc_2",
      name: "Monzo Joint Account",
      type: "Current",
      balance: 0,
      currency: "GBP",
    });
  });

  it("throws when accounts fetch fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("unauthorized"),
    });
    await expect(provider.fetchAccounts("bad")).rejects.toThrow(
      "Failed to fetch Monzo accounts: unauthorized",
    );
  });

  it("fetches and categorizes transactions and handles non-ok responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
    expect(await provider.fetchTransactions("tok", "acc_1")).toEqual([]);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          transactions: [
            { decline_reason: "INSUFFICIENT_FUNDS", amount: -1000 },
            {
              amount: -2500,
              merchant: { name: "Tesco" },
              category: "groceries",
              created: "2026-01-01T10:00:00Z",
            },
            {
              amount: -5000,
              description: "Water Bill",
              category: "utilities",
              created: "2026-01-02T10:00:00Z",
            },
            {
              amount: 300000,
              description: "Employer",
              category: "salary",
              created: "2026-01-03T10:00:00Z",
            },
            {
              amount: -450,
              description: "TfL",
              category: "transport",
              created: "2026-01-04T10:00:00Z",
            },
            {
              amount: -1999,
              description: "Amazon",
              category: "shopping",
              created: "2026-01-05T10:00:00Z",
            },
            {
              amount: -100,
              category: "other",
              created: "2026-01-06T10:00:00Z",
            },
          ],
        }),
    });

    const txs = await provider.fetchTransactions("tok", "acc_1", { limit: 10 });
    expect(txs).toHaveLength(6);
    expect(txs.map((t) => t.category)).toEqual([
      "Food",
      "Utilities",
      "Salary",
      "Transport",
      "Shopping",
      "General",
    ]);
    expect(txs[0].amount).toBe(-25);
    expect(txs[0].description).toBe("Tesco");
    expect(txs[5].description).toBe("Monzo Sync Transaction");
  });
});
