// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as entry from "./home-strip-entry.js";

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

describe("the home strip entry", () => {
  it("reaches the take-home core but no vector, no sign-off check and no payoff schedule", () => {
    const files = [...reach(resolve(__dirname, "home-strip-entry.ts"))];
    expect(files.some((f) => f.endsWith("/uk-take-home-core.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("/home-strip.ts"))).toBe(true);
    expect(files.filter((f) => f.includes("test-vectors"))).toEqual([]);
    expect(files.some((f) => f.endsWith("tax-year-verification.ts"))).toBe(false);
    expect(files.some((f) => f.endsWith("/uk-take-home.ts"))).toBe(false);
    expect(files.some((f) => f.endsWith("debt-payoff.ts"))).toBe(false);
  });

  it("uk-take-home.ts, which web and the backend import, still reaches the sign-off check", () => {
    const files = [...reach(resolve(__dirname, "uk-take-home.ts"))];
    expect(files.some((f) => f.endsWith("tax-year-verification.ts"))).toBe(true);
    expect(files.some((f) => f.includes("test-vectors"))).toBe(true);
  });

  it("exports what the mobile Home strip uses", () => {
    for (const name of [
      "selectHomeStrip",
      "selectHomeStripFromRows",
      "homeStripBudget",
      "budgetHasSpending",
      "budgetSurplusOrNull",
      "budgetLeavesOut",
      "budgetRefusalNotice",
      "budgetCountsWorkedOutTakeHome",
      "selectBudgetFigures",
      "budgetEntryFromRow",
      "profileFactsFromProfile",
      "withLinkedBudgetRows",
      "selectBudgetTotals",
      "selectTakeHome",
      "selectConsumerDebtTotal",
      "PortfolioSnapshot",
      "getUkTaxYearContext",
    ]) {
      expect(typeof (entry as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
