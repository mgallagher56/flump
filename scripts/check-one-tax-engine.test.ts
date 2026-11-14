import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { ALLOWED_READERS, checkFile, REMOVED_IMPLEMENTATIONS } from "./lib/one-tax-engine";

const messages = (file: string, source: string) => checkFile(file, source).map((v) => v.message);

describe("one tax engine law (E25 T15)", () => {
  test("the repo passes", () => {
    const run = spawnSync("bun", [resolve(import.meta.dir, "check-one-tax-engine.ts")], {
      encoding: "utf8",
    });
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
  });

  test("a second National Insurance calculation in an app fails", () => {
    const source = `
      export function myNi(pay: number, rules: Rules) {
        const { primaryThreshold, upperEarningsLimit } = rules.ni.class1;
        return (Math.min(pay, upperEarningsLimit) - primaryThreshold) * rules.ni.class1.mainRate;
      }`;
    const found = messages("apps/web/app/features/take-home/myNi.ts", source);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("reads 5 tax rate or threshold field(s)");
  });

  test("a second band walk in a new engine file fails", () => {
    const source = "const tax = Math.min(taxable, e.basicRateBandWidth) * e.basicRate;";
    expect(messages("packages/finance-engine/src/quick-tax.ts", source)).toHaveLength(1);
  });

  test("bringing back a removed implementation fails, even in a rules file", () => {
    for (const name of REMOVED_IMPLEMENTATIONS) {
      const found = messages(
        "packages/finance-engine/src/tax-rules.ts",
        `export function ${name}() {}`,
      );
      expect(found.some((m) => m.startsWith(`${name} was removed`))).toBe(true);
    }
  });

  test("the rules files may hold the arithmetic", () => {
    const source = "const tax = Math.min(taxable, e.basicRateBandWidth) * e.basicRate;";
    expect(messages("packages/finance-engine/src/uk-tax-year.ts", source)).toEqual([]);
  });

  test("an allowed reader cannot grow past its ceiling", () => {
    const file = "packages/finance-engine/src/uk-take-home.ts";
    const read = "const g = 1 / (1 - rules.ewni.basicRate);\n";
    expect(messages(file, read.repeat(ALLOWED_READERS[file]?.max ?? 0))).toEqual([]);
    expect(messages(file, read.repeat((ALLOWED_READERS[file]?.max ?? 0) + 1))).toHaveLength(1);
  });

  test("calling the rule functions, and mentions in comments, pass", () => {
    const source = `
      // not a read: e.basicRateBandWidth and calculateUKEWNITakeHome in a comment
      /* nor this: rules.ni.class1.mainRate */
      const ni = calculateEmployeeNi(pay, getUkTaxYearRules(year));`;
    expect(messages("apps/web/app/features/take-home/x.ts", source)).toEqual([]);
  });
});
