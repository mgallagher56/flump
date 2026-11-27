// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as entry from "./accounts-entry.js";

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

describe("the accounts entry", () => {
  it("reaches no test vector module, so the app bundle carries none", () => {
    const files = [...reach(resolve(__dirname, "accounts-entry.ts"))];
    expect(files.some((f) => f.endsWith("account-balance.ts"))).toBe(true);
    expect(files.filter((f) => f.includes("test-vectors"))).toEqual([]);
    expect(files.some((f) => f.endsWith("tax-year-verification.ts"))).toBe(false);
  });

  it("exports what the mobile accounts screens use", () => {
    for (const name of [
      "categorizeAccountType",
      "isLeftOutOfNetWorth",
      "isOwedAccountType",
      "selectAccountBalance",
      "selectAccountBalanceSeries",
      "selectAccountChangeEffect",
      "selectAccountGroups",
      "selectSeriesChange",
      "toShownBalance",
      "describeJointWholeValue",
      "describeJointShareOfWhole",
      "describeJointWholeHistory",
      "resolveAccountOwnership",
      "resolveAccountSharePercent",
      "netWorthChoicesAvailable",
    ]) {
      expect(typeof (entry as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
