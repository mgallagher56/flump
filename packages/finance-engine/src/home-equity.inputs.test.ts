import { describe, expect, it } from "vitest";
import { estimateHomeEquity, pickHomeProperty } from "./home-equity.js";

describe("estimateHomeEquity input guards", () => {
  it("has no figure for a home value that is not finite", () => {
    expect(estimateHomeEquity({ homeValue: Number.POSITIVE_INFINITY })).toBeNull();
    expect(estimateHomeEquity({ homeValue: Number.NaN })).toBeNull();
  });

  it("counts a mortgage balance that is not a number as nothing owed", () => {
    // 300,000 - 0 = 300,000, held solely.
    expect(estimateHomeEquity({ homeValue: 300_000, mortgageBalance: Number.NaN })).toEqual({
      whole: 300_000,
      yours: 300_000,
    });
  });

  it("treats a share that is not a number as held solely", () => {
    // Home share NaN counts as 100%, mortgage share 50%:
    // yours = 300,000 x 100 / 100 - 100,000 x 50 / 100 = 300,000 - 50,000 = 250,000.
    expect(
      estimateHomeEquity({
        homeValue: 300_000,
        homeSharePercent: Number.NaN,
        mortgageBalance: 100_000,
        mortgageSharePercent: 50,
      }),
    ).toEqual({ whole: 200_000, yours: 250_000 });
    // Home share 50%, mortgage share NaN counts as 100%:
    // yours = 300,000 x 50 / 100 - 100,000 x 100 / 100 = 150,000 - 100,000 = 50,000.
    expect(
      estimateHomeEquity({
        homeValue: 300_000,
        homeSharePercent: 50,
        mortgageBalance: 100_000,
        mortgageSharePercent: Number.NaN,
      }),
    ).toEqual({ whole: 200_000, yours: 50_000 });
  });
});

describe("pickHomeProperty with other account types", () => {
  it("only takes a saved home kind from a Property account", () => {
    // A mortgage row carrying the "home" kind is not a property, so the older name rule decides
    // and the one Property account is the home.
    const home = { id: "h", name: "Home", type: "Property" };
    const mortgage = { id: "m", name: "Mortgage", type: "Mortgage", accountSubtype: "home" };
    const bank = { id: "c", name: "Bank", type: "Current" };
    expect(pickHomeProperty([home, mortgage, bank])).toEqual({ status: "one", account: home });
  });
});
