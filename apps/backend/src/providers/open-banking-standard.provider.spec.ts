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

  it("should fetch accounts and balances from standard OBIE v3.1 endpoints", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/accounts")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Data: {
                Account: [
                  {
                    AccountId: "acc-hsbc-001",
                    Currency: "GBP",
                    AccountSubType: "CurrentAccount",
                    Nickname: "Premier Current",
                  },
                ],
              },
            }),
        });
      }
      if (url.includes("/balances")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Data: {
                Balance: [
                  {
                    Amount: { Amount: "3450.75", Currency: "GBP" },
                  },
                ],
              },
            }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    const accounts = await hsbcProvider.fetchAccounts("hsbc-token");
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual({
      externalAccountId: "hsbc-acc-hsbc-001",
      name: "HSBC Bank Premier Current",
      type: "Current",
      balance: 3450.75,
      currency: "GBP",
    });
  });
});
