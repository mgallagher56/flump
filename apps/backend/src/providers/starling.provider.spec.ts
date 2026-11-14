import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeBank, type FakeBank, json } from "./__fixtures__/fake-bank";
import { starlingCase } from "./__fixtures__/provider-cases";
import { StarlingProvider } from "./starling.provider";

// Failure modes are covered for every provider in provider-failure-modes.spec.ts; this file
// checks Starling-specific mapping.
function config(sandbox: boolean): ConfigService {
  return { get: () => (sandbox ? "true" : "false") } as unknown as ConfigService;
}

describe("StarlingProvider", () => {
  let bank: FakeBank;

  beforeEach(() => {
    bank = createFakeBank(starlingCase.routes);
    vi.stubGlobal("fetch", bank.fetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("generates production and sandbox auth urls", () => {
    expect(new StarlingProvider(config(false)).getAuthUrl("cid", "http://cb", "st")).toContain(
      "https://oauth.starlingbank.com/?",
    );
    expect(new StarlingProvider(config(true)).getAuthUrl("cid", "http://cb", "st")).toContain(
      "https://oauth-sandbox.starlingbank.com/?",
    );
  });

  it("uses the sandbox API host when configured", async () => {
    const sandboxBank = createFakeBank([
      {
        key: "token",
        method: "POST",
        path: /^https:\/\/api-sandbox\.starlingbank\.com\/oauth\/access-token$/,
        respond: json({ access_token: "at" }),
      },
    ]);
    vi.stubGlobal("fetch", sandboxBank.fetch);
    await expect(
      new StarlingProvider(config(true)).exchangeCode("c", "s", "http://cb", "x"),
    ).resolves.toEqual({
      accessToken: "at",
      refreshToken: undefined,
      expiresIn: undefined,
    });
  });

  it.each([
    ["JOINT", "Starling Joint Account"],
    ["SOLE_TRADER", "Starling Sole Trader Account"],
    ["PRIMARY", "Starling Current Account"],
  ])("names a %s account %s", async (accountType, name) => {
    bank.failAlways(
      "accounts",
      json({
        accounts: [{ accountUid: "a-1", defaultCategory: "c-1", accountType, currency: "GBP" }],
      }),
    );
    const [first] = await new StarlingProvider(config(false)).fetchAccounts("tok");
    expect(first?.name).toBe(name);
  });

  it("asks the feed for changes since the date given", async () => {
    await new StarlingProvider(config(false)).fetchTransactions("tok", "a-1:c-1", {
      since: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(bank.callsTo("transactions")[0]?.url).toContain(
      "changesSince=2026-10-01T00%3A00%3A00.000Z",
    );
  });

  it("returns no transactions for a savings space without calling the API", async () => {
    await expect(
      new StarlingProvider(config(false)).fetchTransactions("tok", "space:a-1:g-1"),
    ).resolves.toEqual([]);
    expect(bank.calls).toHaveLength(0);
  });

  it("rejects an external id without a category", async () => {
    await expect(
      new StarlingProvider(config(false)).fetchTransactions("tok", "a-1"),
    ).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  it("rejects a feed item with an unknown direction", async () => {
    bank.failAlways(
      "transactions",
      json({
        feedItems: [
          {
            direction: "SIDEWAYS",
            amount: { minorUnits: 1 },
            transactionTime: "2026-11-01T00:00:00Z",
          },
        ],
      }),
    );
    await expect(
      new StarlingProvider(config(false)).fetchTransactions("tok", "a-1:c-1"),
    ).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });
});
