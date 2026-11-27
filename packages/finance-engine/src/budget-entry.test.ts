// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as entry from "./budget-entry.js";
import { calculateSafeToSpend as healthCalculate } from "./health-score.js";
import { calculateSafeToSpend as allowanceCalculate } from "./safe-to-spend-allowance.js";

/** Every module a file reaches through value imports and re-exports (type-only ones are erased). */
function reach(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  for (const m of source.matchAll(/^(?:import|export)\s+(?!type\b)[^;]*?from\s+"(\.[^"]+)"/gms)) {
    reach(resolve(dirname(file), (m[1] as string).replace(/\.js$/, ".ts")), seen);
  }
  return seen;
}

describe("the budget entry", () => {
  it("reaches the page and the take-home core but no vector, no sign-off check and no payoff schedule", () => {
    const files = [...reach(resolve(__dirname, "budget-entry.ts"))];
    expect(files.some((f) => f.endsWith("/budget-page.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("/uk-take-home-core.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("/safe-to-spend-allowance.ts"))).toBe(true);
    expect(files.filter((f) => f.includes("test-vectors"))).toEqual([]);
    expect(files.some((f) => f.endsWith("tax-year-verification.ts"))).toBe(false);
    expect(files.some((f) => f.endsWith("/uk-take-home.ts"))).toBe(false);
    expect(files.some((f) => f.endsWith("debt-payoff.ts"))).toBe(false);
    expect(files.some((f) => f.endsWith("/health-score.ts"))).toBe(false);
    expect(files.some((f) => f.endsWith("/picture/build.ts"))).toBe(false);
  });

  it("health-score.ts still hands out the same safe-to-spend calculation", () => {
    expect(healthCalculate).toBe(allowanceCalculate);
  });

  it("exports what the mobile Budget tab uses", () => {
    for (const name of [
      "selectBudgetPageFromRows",
      "selectBudgetPage",
      "selectBudgetOverview",
      "rankBudgetCategories",
      "budgetCategoryEntries",
      "budgetPageCategories",
      "budgetEntryShownMonthly",
      "pageBudgetRows",
      "isIncomeEntry",
      "isIncomeCategory",
      "linkedAccountFor",
      "linkedBudgetSource",
      "selectBreathingRoomBasis",
      "breathingRoomFixedReason",
      "runwaySetup",
      "runwayIllustration",
      "selectRunwayIllustration",
      "clampRunwayLump",
      "clampRunwayCut",
      "describeBreathingRoom",
      "breathingRoomPhrase",
      "budgetEntryFromRow",
      "monthsOfCoverFor",
      "getUkTaxYearContext",
    ]) {
      expect(typeof (entry as Record<string, unknown>)[name]).toBe("function");
    }
    expect(entry.INCOME_CATEGORY).toBe("income");
    expect(entry.RUNWAY_LUMP_MAX).toBe(100000);
    expect(entry.STANDARD_BUDGET_CATEGORIES).toEqual([
      "housing",
      "bills",
      "expenses",
      "savings",
      "income",
    ]);
  });
});
