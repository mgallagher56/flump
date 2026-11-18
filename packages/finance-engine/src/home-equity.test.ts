import { describe, expect, it } from "vitest";
import { estimateHomeEquity } from "./home-equity.js";

describe("estimateHomeEquity", () => {
  it("is value less mortgage for a home held solely", () => {
    // 300,000 - 200,000 = 100,000; sole share is 100%, so yours = 100,000.
    expect(estimateHomeEquity({ homeValue: 300_000, mortgageBalance: 200_000 })).toEqual({
      whole: 100_000,
      yours: 100_000,
    });
  });

  it("treats a null share as sole", () => {
    // 250,000 - 150,000 = 100,000; null share means 100%, so yours = 100,000.
    expect(
      estimateHomeEquity({ homeValue: 250_000, mortgageBalance: 150_000, sharePercent: null }),
    ).toEqual({ whole: 100_000, yours: 100_000 });
  });

  it("gives half the equity at a 50% joint share", () => {
    // 400,000 - 240,000 = 160,000 whole; 160,000 x 50 / 100 = 80,000 yours.
    expect(
      estimateHomeEquity({ homeValue: 400_000, mortgageBalance: 240_000, sharePercent: 50 }),
    ).toEqual({ whole: 160_000, yours: 80_000 });
  });

  it("gives the equity at a share other than half", () => {
    // 350,000 - 125,000 = 225,000 whole; 225,000 x 40 / 100 = 90,000 yours.
    expect(
      estimateHomeEquity({ homeValue: 350_000, mortgageBalance: 125_000, sharePercent: 40 }),
    ).toEqual({ whole: 225_000, yours: 90_000 });
  });

  it("is the whole value when there is no mortgage", () => {
    // Missing balance counts as 0 owed: 275,000 - 0 = 275,000.
    expect(estimateHomeEquity({ homeValue: 275_000 })).toEqual({
      whole: 275_000,
      yours: 275_000,
    });
  });

  it("returns negative equity as a negative number", () => {
    // 180,000 - 195,000 = -15,000 whole; at a 50% share, -15,000 x 50 / 100 = -7,500 yours.
    expect(
      estimateHomeEquity({ homeValue: 180_000, mortgageBalance: 195_000, sharePercent: 50 }),
    ).toEqual({ whole: -15_000, yours: -7_500 });
  });

  it("is unknown when no value above 0 is known", () => {
    // No value means no equity figure at all, never a made-up 0 or minus the mortgage.
    expect(estimateHomeEquity({ homeValue: null, mortgageBalance: 100_000 })).toBeNull();
    expect(estimateHomeEquity({ homeValue: 0, mortgageBalance: 100_000 })).toBeNull();
    expect(estimateHomeEquity({ homeValue: undefined })).toBeNull();
  });
});
