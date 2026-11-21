// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { londonMonth, londonMonthParts } from "./londonMonth";

describe("londonMonth", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("reads the month on the London clock, not the machine clock", () => {
    // British Summer Time began on 29 March 2026, so 23:30 UTC on 31 March is 00:30 on 1 April in
    // London. A machine on UTC would still say March.
    process.env.TZ = "UTC";
    const instant = new Date("2026-03-31T23:30:00Z");
    expect(londonMonth(instant)).toBe("2026-04");
    expect(londonMonthParts(instant)).toEqual({ year: 2026, month: 4 });
  });

  it("pads single-digit months", () => {
    expect(londonMonth(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01");
  });
});
