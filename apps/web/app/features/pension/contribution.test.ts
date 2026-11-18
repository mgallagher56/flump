import { describe, expect, it } from "vitest";
import { pensionRatesAssumed } from "./contribution";

describe("pensionRatesAssumed", () => {
  it("is true only for the exact 5% and 3% creation defaults", () => {
    expect(pensionRatesAssumed({ pensionPercent: 5, pensionEmployerPercent: 3 })).toBe(true);
    expect(pensionRatesAssumed({ pensionPercent: 5, pensionEmployerPercent: 4 })).toBe(false);
    expect(pensionRatesAssumed({ pensionPercent: 6, pensionEmployerPercent: 3 })).toBe(false);
    expect(pensionRatesAssumed({})).toBe(false);
  });
});
