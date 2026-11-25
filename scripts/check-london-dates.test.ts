import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { countLocalDateReads, LONDON_DATE_HOME } from "./lib/london-dates";
import { repoRoot } from "./lib/scan";

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

  test("the home is uk-tax-year-calendar.ts, where getUkCalendarDate's formatter now lives", () => {
    expect(LONDON_DATE_HOME).toBe("packages/finance-engine/src/uk-tax-year-calendar.ts");
    const home = readFileSync(resolve(repoRoot, LONDON_DATE_HOME), "utf8");
    expect(home.match(/timeZone: *["']Europe\/London["']/g)?.length).toBe(1);
    expect(countLocalDateReads(home, LONDON_DATE_HOME)).toBe(0);
  });

  test("a second London formatter in any other finance-engine file counts", () => {
    const copy = 'new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });';
    for (const file of [
      "packages/finance-engine/src/uk-tax-year.ts",
      "packages/finance-engine/src/retirement.ts",
    ]) {
      expect(countLocalDateReads(copy, file)).toBe(1);
    }
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
