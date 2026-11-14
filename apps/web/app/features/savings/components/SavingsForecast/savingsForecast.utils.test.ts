import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatRate,
  monthsToGoal,
  projectSavings,
  TODAYS_MONEY_INFLATION,
} from "./savingsForecast.utils";

describe("projectSavings", () => {
  it("compounds monthly and splits paid in from interest", () => {
    const result = projectSavings({
      starting: 21000,
      monthly: 300,
      rate: 4,
      years: 5,
      todaysMoney: false,
    });
    expect(result.points).toHaveLength(6);
    expect(result.paidIn).toBe(18000);
    expect(result.final).toBeGreaterThan(21000 + 18000);
    expect(result.interest).toBeCloseTo(result.final - 39000, 6);
    expect(result.flat).toBe(false);
  });

  it("is flat with nothing paid in and no rate", () => {
    const result = projectSavings({
      starting: 21000,
      monthly: 0,
      rate: 0,
      years: 5,
      todaysMoney: false,
    });
    expect(result.flat).toBe(true);
    expect(result.final).toBe(21000);
  });

  it("is flat with an empty starting amount, no monthly amount and a rate", () => {
    expect(
      projectSavings({ starting: 0, monthly: 0, rate: 4, years: 5, todaysMoney: false }).flat,
    ).toBe(true);
  });

  it("takes inflation off the rate in today's money, never below 0", () => {
    expect(
      projectSavings({ starting: 1000, monthly: 0, rate: 4, years: 1, todaysMoney: true })
        .effectiveRate,
    ).toBeCloseTo(4 - TODAYS_MONEY_INFLATION);
    expect(
      projectSavings({ starting: 1000, monthly: 0, rate: 1, years: 1, todaysMoney: true })
        .effectiveRate,
    ).toBe(0);
  });
});

describe("monthsToGoal", () => {
  it("says when the starting amount already meets the goal", () => {
    expect(monthsToGoal({ starting: 5000, monthly: 0, effectiveRate: 0, goal: 4000 })).toEqual({
      status: "reached",
    });
  });
  it("counts the months to a goal", () => {
    expect(monthsToGoal({ starting: 0, monthly: 100, effectiveRate: 0, goal: 1000 })).toEqual({
      status: "months",
      months: 10,
    });
  });
  it("gives up after 50 years", () => {
    expect(monthsToGoal({ starting: 0, monthly: 0, effectiveRate: 0, goal: 1000 })).toEqual({
      status: "not-reached",
    });
  });
});

describe("formatting", () => {
  it("reads durations over 24 months as years and months", () => {
    expect(formatDuration(20)).toBe("20 months");
    expect(formatDuration(30)).toBe("2 years 6 months");
    expect(formatDuration(36)).toBe("3 years");
  });
  it("shows a computed rate to at most 1 decimal place", () => {
    expect(formatRate(4)).toBe("4%");
    expect(formatRate(6.375)).toBe("6.4%");
  });
});
