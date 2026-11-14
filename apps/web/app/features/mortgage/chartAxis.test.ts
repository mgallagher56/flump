import { describe, expect, it } from "vitest";
import { evenYearTicks, maxYearTicks } from "./chartAxis";

const span = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

describe("mortgage chart axis", () => {
  it("spaces year ticks evenly, at most six on a wide plot", () => {
    expect(evenYearTicks(span(2026, 2045), maxYearTicks(900, 6))).toEqual([
      "2026",
      "2030",
      "2034",
      "2038",
      "2042",
    ]);
  });

  it("keeps to four year ticks on a narrow plot", () => {
    const ticks = evenYearTicks(span(2026, 2045), maxYearTicks(320, 6));
    expect(ticks).toEqual(["2026", "2031", "2036", "2041"]);
  });

  it("treats an unmeasured plot as wide", () => {
    expect(maxYearTicks(0, 6)).toBe(6);
    expect(maxYearTicks(479, 6)).toBe(4);
  });
});
