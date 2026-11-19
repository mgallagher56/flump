import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

// The UK calendar date must not depend on the server's time zone. CI runs in UTC and a
// developer's machine often runs in Europe/London, where a formatter that forgot its time zone
// would still look right. This file loads the module under time zones far from London
// (Kiritimati is UTC+14, Los Angeles is UTC-7 in April) so the London rule is checked anywhere.
// Node re-reads process.env.TZ when it changes, and the formatter is built when the module
// loads, so the module is loaded fresh after each change.

const originalTz = process.env.TZ;

async function loadUnder(tz: string) {
  process.env.TZ = tz;
  vi.resetModules();
  return import("./uk-tax-year.js");
}

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
  vi.resetModules();
});

describe("UK calendar date whatever the server's time zone", () => {
  it("in a zone ahead of London, keeps 5 April until London midnight", async () => {
    const m = await loadUnder("Pacific/Kiritimati");
    // 12:00 UTC on 5 April 2026 is 13:00 BST in London (still 5 April) and 02:00 on 6 April
    // in Kiritimati. 5 April is the last day of 2025/26.
    const instant = new Date("2026-04-05T12:00:00Z");
    expect(m.getUkCalendarDate(instant)).toBe("2026-04-05");
    vi.useFakeTimers();
    vi.setSystemTime(instant);
    expect(m.getCurrentUkTaxYear()).toBe("2025/26");
  });

  it("in a zone behind London, starts 6 April at London midnight", async () => {
    const m = await loadUnder("America/Los_Angeles");
    // 05:30 UTC on 6 April 2026 is 06:30 BST in London (6 April) and 22:30 PDT on 5 April in
    // Los Angeles. 6 April is the first day of 2026/27.
    const instant = new Date("2026-04-06T05:30:00Z");
    expect(m.getUkCalendarDate(instant)).toBe("2026-04-06");
    vi.useFakeTimers();
    vi.setSystemTime(instant);
    expect(m.getCurrentUkTaxYear()).toBe("2026/27");
  });
});
