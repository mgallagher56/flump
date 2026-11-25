import { describe, expect, test } from "bun:test";
import { countLocalDateReads, LONDON_DATE_HOME } from "./lib/london-dates";

describe("countLocalDateReads on the real past mistakes", () => {
  test("9add200d3: the current month from the device clock (apps/web/app/utils/accounts.ts)", () => {
    const removed = [
      "  const currentM = now.getMonth() + 1;",
      "  const currentY = now.getFullYear();",
    ];
    expect(countLocalDateReads(removed.join("\n"))).toBe(2);
  });

  test("87cb47e23: today in the machine's zone (verify-flump invoicing journey)", () => {
    expect(countLocalDateReads('const today = new Date().toLocaleDateString("en-CA");')).toBe(1);
  });

  test("3a96cff2f: a second copy of the London formatter (RetirementPlanner ukIsoDate)", () => {
    const removed = 'return new Intl.DateTimeFormat("en-CA", {\n    timeZone: "Europe/London",';
    expect(
      countLocalDateReads(removed, "apps/web/app/features/retirement/RetirementPlanner.tsx"),
    ).toBe(1);
  });
});

describe("countLocalDateReads rules", () => {
  test("the one home may hold the London formatter", () => {
    expect(countLocalDateReads('timeZone: "Europe/London",', LONDON_DATE_HOME)).toBe(0);
  });

  test("UTC reads and a zoned toLocaleDateString are fine", () => {
    const ok = [
      "d.getUTCMonth(); d.getUTCFullYear(); d.getUTCDate();",
      'd.toLocaleDateString("en-GB", { timeZone: "UTC" });',
      "d.toISOString();",
    ].join("\n");
    expect(countLocalDateReads(ok)).toBe(0);
  });

  test("the UTC date taken as today counts in both forms", () => {
    expect(
      countLocalDateReads('a.toISOString().slice(0, 10); b.toISOString().split("T")[0];'),
    ).toBe(2);
    expect(countLocalDateReads("a.toISOString().slice(0, 7);")).toBe(1);
  });
});
