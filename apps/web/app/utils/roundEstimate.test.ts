import { describe, expect, it } from "vitest";
import { formatEstimate, roundEstimate } from "./roundEstimate";

describe("roundEstimate", () => {
  it("rounds to three significant figures", () => {
    expect(roundEstimate(205_628)).toBe(206_000);
    expect(roundEstimate(405_123)).toBe(405_000);
    expect(roundEstimate(101_234)).toBe(101_000);
    expect(roundEstimate(41_512)).toBe(41_500);
    expect(roundEstimate(13_852)).toBe(13_900);
    expect(roundEstimate(1_652)).toBe(1_650);
    expect(roundEstimate(1_000_499)).toBe(1_000_000);
  });

  it("keeps whole pounds under £1,000 and handles zero and bad input", () => {
    expect(roundEstimate(685.4)).toBe(685);
    expect(roundEstimate(0)).toBe(0);
    // Never "-£0".
    expect(roundEstimate(-0.4)).toBe(0);
    expect(roundEstimate(Number.NaN)).toBe(0);
    expect(roundEstimate(-13_852)).toBe(-13_900);
  });

  it("formats as About £N in en-GB", () => {
    expect(formatEstimate(205_628)).toBe("About £206,000");
    expect(formatEstimate(51_407)).toBe("About £51,400");
  });
});
