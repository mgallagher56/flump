import { describe, expect, it } from "vitest";
import { roundTo2dp } from "./roundTo2dp";

describe("roundTo2dp", () => {
  it("rounds to two decimals", () => {
    expect(roundTo2dp(10.005)).toBe(10.01);
    expect(roundTo2dp(1.234)).toBe(1.23);
    expect(roundTo2dp(33.33333)).toBe(33.33);
  });
  it("leaves values with at most two decimals alone", () => {
    expect(roundTo2dp(0)).toBe(0);
    expect(roundTo2dp(-4.5)).toBe(-4.5);
    expect(roundTo2dp(1234567.89)).toBe(1234567.89);
  });
});
