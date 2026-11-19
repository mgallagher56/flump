import { describe, expect, it } from "vitest";
import { selectRecordedMonthComparison } from "./recorded-month-comparison.js";

describe("selectRecordedMonthComparison current month format", () => {
  it("rejects a current month with anything before or after YYYY-MM", () => {
    expect(() => selectRecordedMonthComparison([], "2026-05-01")).toThrow(RangeError);
    expect(() => selectRecordedMonthComparison([], "x2026-05")).toThrow(RangeError);
  });

  it("ignores a series point whose month has extra characters", () => {
    // "2026-04-30" is not a month key, so only the one recorded May point counts: no comparison.
    const result = selectRecordedMonthComparison(
      [
        { month: "2026-04-30", netWorth: 1000, allCarried: false },
        { month: "2026-05", netWorth: 1200, allCarried: false },
      ],
      "2026-05",
    );
    expect(result.recordedMonths).toBe(1);
    expect(result.comparison).toBeNull();
  });
});
