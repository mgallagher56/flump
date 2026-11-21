// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { isFutureMonth } from "./accounts";

describe("isFutureMonth without a given month", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("uses the London month when no month or year is given", () => {
    // 15 July 2026 at noon UTC is July in London, so August 2026 is ahead and June is not.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
    expect(isFutureMonth(8, 2026)).toBe(true);
    expect(isFutureMonth(6, 2026)).toBe(false);
  });

  test("keeps a given month and fills only the missing year from London", () => {
    // London is July 2026. With month 4 given and the year filled as 2026, May 2026 is ahead
    // of April 2026. Taking London's month (7) in place of the given 4 would make it not ahead.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
    expect(isFutureMonth(5, 2026, 4)).toBe(true);
  });

  test("fills only the missing month from London when the year is given", () => {
    // London is July 2026, so with the year given as 2026, August 2026 is ahead.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
    expect(isFutureMonth(8, 2026, undefined, 2026)).toBe(true);
  });
});
