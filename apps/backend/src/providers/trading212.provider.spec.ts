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
});
