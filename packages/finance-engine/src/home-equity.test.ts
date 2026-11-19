import { describe, expect, it } from "vitest";
import { estimateHomeEquity, isResidentialHomeAccount, pickHomeProperty } from "./home-equity.js";

describe("estimateHomeEquity", () => {
  it("is value less mortgage for a home held solely", () => {
    // 300,000 - 200,000 = 100,000; both held solely (100%), so yours = 100,000.
    expect(estimateHomeEquity({ homeValue: 300_000, mortgageBalance: 200_000 })).toEqual({
      whole: 100_000,
      yours: 100_000,
    });
  });

  it("treats null shares as sole", () => {
    // 250,000 - 150,000 = 100,000; null shares mean 100%, so yours = 100,000.
    expect(
      estimateHomeEquity({
        homeValue: 250_000,
        homeSharePercent: null,
        mortgageBalance: 150_000,
        mortgageSharePercent: null,
      }),
    ).toEqual({ whole: 100_000, yours: 100_000 });
  });

  it("gives half the equity when the home and the mortgage are both 50% joint", () => {
    // Whole: 400,000 - 240,000 = 160,000.
    // Yours: 400,000 x 50 / 100 - 240,000 x 50 / 100 = 200,000 - 120,000 = 80,000.
    expect(
      estimateHomeEquity({
        homeValue: 400_000,
        homeSharePercent: 50,
        mortgageBalance: 240_000,
        mortgageSharePercent: 50,
      }),
    ).toEqual({ whole: 160_000, yours: 80_000 });
  });

  it("gives the equity at a share other than half", () => {
    // Whole: 350,000 - 125,000 = 225,000.
    // Yours: 350,000 x 40 / 100 - 125,000 x 40 / 100 = 140,000 - 50,000 = 90,000.
    expect(
      estimateHomeEquity({
        homeValue: 350_000,
        homeSharePercent: 40,
        mortgageBalance: 125_000,
        mortgageSharePercent: 40,
      }),
    ).toEqual({ whole: 225_000, yours: 90_000 });
  });

  it("takes each side at its own share when the shares differ", () => {
    // Sole home, 50% joint mortgage. Whole: 300,000 - 200,000 = 100,000.
    // Yours: 300,000 x 100 / 100 - 200,000 x 50 / 100 = 300,000 - 100,000 = 200,000.
    expect(
      estimateHomeEquity({
        homeValue: 300_000,
        homeSharePercent: null,
        mortgageBalance: 200_000,
        mortgageSharePercent: 50,
      }),
    ).toEqual({ whole: 100_000, yours: 200_000 });
  });

  it("is the whole value when there is no mortgage", () => {
    // Missing balance counts as 0 owed: 275,000 - 0 = 275,000.
    expect(estimateHomeEquity({ homeValue: 275_000 })).toEqual({
      whole: 275_000,
      yours: 275_000,
    });
  });

  it("returns negative equity as a negative number", () => {
    // Whole: 180,000 - 195,000 = -15,000.
    // Yours at 50% of each: 90,000 - 97,500 = -7,500.
    expect(
      estimateHomeEquity({
        homeValue: 180_000,
        homeSharePercent: 50,
        mortgageBalance: 195_000,
        mortgageSharePercent: 50,
      }),
    ).toEqual({ whole: -15_000, yours: -7_500 });
  });

  it("is unknown when no value above 0 is known", () => {
    // No value means no equity figure at all, never a made-up 0 or minus the mortgage.
    expect(estimateHomeEquity({ homeValue: null, mortgageBalance: 100_000 })).toBeNull();
    expect(estimateHomeEquity({ homeValue: 0, mortgageBalance: 100_000 })).toBeNull();
    expect(estimateHomeEquity({ homeValue: undefined })).toBeNull();
  });
});

describe("pickHomeProperty", () => {
  const home = { id: "h", name: "Home (your estimate)", type: "Property" };
  const rental = { id: "r", name: "Rental flat", type: "Property" };
  const btl = { id: "b", name: "Buy-to-let flat", type: "Property" };
  const mortgage = { id: "m", name: "Mortgage", type: "Mortgage" };

  it("gives the one Property account that is not buy to let as the home", () => {
    expect(pickHomeProperty([mortgage, home, btl])).toEqual({ status: "one", account: home });
  });

  it("gives no home when every property is buy to let or there is none", () => {
    expect(pickHomeProperty([mortgage, btl])).toEqual({ status: "none" });
    expect(pickHomeProperty([])).toEqual({ status: "none" });
  });

  it("is ambiguous when two properties could each be the home", () => {
    expect(pickHomeProperty([home, rental, btl])).toEqual({
      status: "ambiguous",
      accounts: [home, rental],
    });
  });
});

describe("isResidentialHomeAccount", () => {
  it("counts a Property account that is not buy to let as a home", () => {
    expect(isResidentialHomeAccount({ type: "Property", name: "Home (your estimate)" })).toBe(true);
    expect(isResidentialHomeAccount({ type: "property", name: "Flat" })).toBe(true);
  });

  it("leaves out buy to let property and every other type", () => {
    expect(isResidentialHomeAccount({ type: "Property", name: "Buy to let flat" })).toBe(false);
    expect(isResidentialHomeAccount({ type: "Property", name: "BTL house" })).toBe(false);
    expect(isResidentialHomeAccount({ type: "Mortgage", name: "Home" })).toBe(false);
    expect(isResidentialHomeAccount({ type: "Saving", name: "House deposit" })).toBe(false);
    expect(isResidentialHomeAccount({ type: null, name: "Home" })).toBe(false);
  });
});
