import { beforeEach, describe, expect, it, vi } from "vitest";
import { Trading212Provider } from "./trading212.provider";

describe("Trading212Provider", () => {
  let provider: Trading212Provider;

  beforeEach(() => {
    provider = new Trading212Provider();
    vi.restoreAllMocks();
  });

  it("should generate correct auth url", () => {
    const authUrl = provider.getAuthUrl("client_123", "http://localhost/cb", "state_abc");
    expect(authUrl).toContain("https://live.trading212.com/oauth/authorize");
    expect(authUrl).toContain("client_id=client_123");
    expect(authUrl).toContain("state=state_abc");
  });

  it("exchanges code and handles error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "t212_acc",
          refresh_token: "t212_ref",
          expires_in: 3600,
        }),
    });

    const res = await provider.exchangeCode("id", "sec", "http://cb", "code");
    expect(res).toEqual({
      accessToken: "t212_acc",
      refreshToken: "t212_ref",
      expiresIn: 3600,
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("denied"),
    });
    await expect(provider.exchangeCode("id", "sec", "http://cb", "bad")).rejects.toThrow(
      "Trading 212 token exchange failed: denied",
    );
  });

  it("should fetch account cash balance and map to Investment type", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/equity/account/cash")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              free: 500,
              total: 12500.5,
              invested: 12000.5,
              ppl: 500,
            }),
        });
      }
      if (url.includes("/equity/account/info")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "987654",
              currencyCode: "GBP",
            }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    const accounts = await provider.fetchAccounts("test-t212-api-key");
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual({
      externalAccountId: "t212-987654",
      name: "Trading 212 Portfolio",
      type: "Investment",
      balance: 12500.5,
      currency: "GBP",
    });
  });

  it("handles cash endpoint failure and info endpoint fallback", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("bad_key"),
    });
    await expect(provider.fetchAccounts("Bearer bad")).rejects.toThrow(
      "Failed to fetch Trading 212 account cash: bad_key",
    );

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/equity/account/cash")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invested: 3000 }),
        });
      }
      return Promise.reject(new Error("info fail"));
    });
    const accounts = await provider.fetchAccounts("Bearer tok");
    expect(accounts[0].externalAccountId).toBe("t212-primary");
    expect(accounts[0].balance).toBe(3000);
  });

  it("fetches order history as transactions", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
    expect(await provider.fetchTransactions("tok", "acc")).toEqual([]);

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("net err"));
    expect(await provider.fetchTransactions("tok", "acc")).toEqual([]);

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          items: [
            { status: "CANCELLED", value: 100 },
            {
              status: "FILLED",
              type: "MARKET_BUY",
              filledValue: 250.5,
              ticker: "VWRL",
              dateExecuted: "2026-02-01T10:00:00Z",
            },
            {
              status: "FILLED",
              type: "SELL",
              value: 100,
            },
          ],
        }),
    });

    const txs = await provider.fetchTransactions("Bearer tok", "acc");
    expect(txs).toHaveLength(2);
    expect(txs[0].amount).toBe(-250.5);
    expect(txs[0].description).toBe("Bought VWRL");
    expect(txs[1].amount).toBe(100);
    expect(txs[1].description).toBe("Sold Equities");
  });
});
