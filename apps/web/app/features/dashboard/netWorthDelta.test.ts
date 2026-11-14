import { describe, expect, it } from "vitest";
import { netWorthDelta, sinceLabel } from "./netWorthDelta";

describe("netWorthDelta", () => {
  it("compares today with the latest earlier recorded month, without a plus sign", () => {
    expect(netWorthDelta(50320, { month: "2026-10", netWorth: 50000 }, "2026-11")).toEqual({
      direction: "up",
      text: "£320 since October",
      polarity: "asset",
    });
  });

  it("reads a fall as down with the amount unsigned", () => {
    expect(netWorthDelta(49000, { month: "2026-10", netWorth: 50000 }, "2026-11")?.text).toBe(
      "£1,000 since October",
    );
  });

  it("names the year when the month is in another year", () => {
    expect(sinceLabel("2025-12", "2026-02")).toBe("December 2025");
  });

  it("is flat when nothing changed and null with no earlier month", () => {
    expect(netWorthDelta(50000, { month: "2026-10", netWorth: 50000 }, "2026-11")?.direction).toBe(
      "flat",
    );
    expect(netWorthDelta(50000, null, "2026-11")).toBeNull();
    expect(netWorthDelta(null, { month: "2026-10", netWorth: 1 }, "2026-11")).toBeNull();
    expect(netWorthDelta(1, { month: "2026-11", netWorth: 0 }, "2026-11")).toBeNull();
  });
});
