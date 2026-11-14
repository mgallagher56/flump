import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { monthsToTarget } from "./deposit-timeline.js";

describe("monthsToTarget", () => {
  it("rounds up to whole months", () => {
    expect(monthsToTarget({ target: 20000, starting: 5000, monthly: 400 })).toEqual({
      status: "months",
      months: 38,
    });
    expect(monthsToTarget({ target: 1200, starting: 0, monthly: 100 })).toEqual({
      status: "months",
      months: 12,
    });
  });

  it("is reached when the starting amount already meets the target", () => {
    expect(monthsToTarget({ target: 10000, starting: 10000, monthly: 0 })).toEqual({
      status: "reached",
    });
    expect(monthsToTarget({ target: 10000, starting: 12000, monthly: 200 })).toEqual({
      status: "reached",
    });
  });

  it("is not reachable with no monthly saving or a non-finite input", () => {
    for (const monthly of [0, -50, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(monthsToTarget({ target: 10000, starting: 0, monthly })).toEqual({
        status: "not-reachable",
      });
    }
    expect(monthsToTarget({ target: Number.NaN, starting: 0, monthly: 100 })).toEqual({
      status: "not-reachable",
    });
  });

  it("property: the months found reach the target and one month fewer falls short", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 50_000 }),
        (target, starting, monthly) => {
          const r = monthsToTarget({ target, starting, monthly });
          if (starting >= target) return r.status === "reached";
          if (r.status !== "months") return false;
          return (
            starting + r.months * monthly >= target && starting + (r.months - 1) * monthly < target
          );
        },
      ),
      { seed: 20261114, numRuns: 300 },
    );
  });
});
