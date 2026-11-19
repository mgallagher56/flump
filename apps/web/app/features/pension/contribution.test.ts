import { describe, expect, it } from "vitest";
import { savedPensionRate } from "./contribution";

describe("savedPensionRate", () => {
  it("keeps a saved rate, including exactly 5 and 3 and 0", () => {
    expect(savedPensionRate(5)).toBe(5);
    expect(savedPensionRate(3)).toBe(3);
    expect(savedPensionRate(0)).toBe(0);
  });

  it("reads a rate never answered as not set, never as a stand-in", () => {
    expect(savedPensionRate(null)).toBeNull();
    expect(savedPensionRate(undefined)).toBeNull();
    expect(savedPensionRate(Number.NaN)).toBeNull();
  });
});
