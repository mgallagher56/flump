import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkScore,
  configuredPackages,
  floorFor,
  formatSummary,
  formatSurvivors,
  listMutateFiles,
  type Mutant,
  type MutantStatus,
  type MutationReport,
  readBaseline,
  readMutateGlobs,
  scoreReport,
} from "./lib/mutation-score";

const root = join(import.meta.dir, "..");
let nextId = 0;

function mutant(status: MutantStatus, line = 1, replacement = "a - b"): Mutant {
  return {
    id: String(nextId++),
    mutatorName: "ArithmeticOperator",
    replacement,
    status,
    location: { start: { line, column: 1 }, end: { line, column: 5 } },
  };
}

function many(status: MutantStatus, n: number): Mutant[] {
  return Array.from({ length: n }, () => mutant(status));
}

describe("scoreReport", () => {
  test("matches Stryker's own figure for the M0 run on mortgage.ts", () => {
    // M0's clear-text table: 281 killed, 8 timed out, 220 survived, 10 no coverage, 0 errors,
    // shown as 55.68%. By hand: caught = 281 + 8 = 289; counted = 289 + 220 + 10 = 519;
    // 289 / 519 = 0.556840... so 55.68%.
    const report: MutationReport = {
      files: {
        "src/mortgage.ts": {
          mutants: [
            ...many("Killed", 281),
            ...many("Timeout", 8),
            ...many("Survived", 220),
            ...many("NoCoverage", 10),
          ],
        },
      },
    };
    const result = scoreReport(report);
    expect(result.counts.total).toBe(519);
    expect(result.score?.toFixed(2)).toBe("55.68");
  });

  test("leaves errors, ignored and pending faults out of the score, as Stryker does", () => {
    // Caught 3 (2 killed + 1 timeout); counted 3 + 1 survived = 4; 3 / 4 = 75%.
    // The compile error, runtime error, ignored and pending faults count in the total only.
    const report: MutationReport = {
      files: {
        "src/a.ts": {
          mutants: [
            ...many("Killed", 2),
            mutant("Timeout"),
            mutant("Survived"),
            mutant("CompileError"),
            mutant("RuntimeError"),
            mutant("Ignored"),
            mutant("Pending"),
          ],
        },
      },
    };
    const result = scoreReport(report);
    expect(result.score).toBe(75);
    expect(result.counts).toEqual({
      killed: 2,
      timeout: 1,
      survived: 1,
      noCoverage: 0,
      errors: 2,
      ignored: 1,
      pending: 1,
      total: 8,
    });
  });

  test("scores each file and the whole report from the pooled counts", () => {
    // a.ts: 1 of 2 caught = 50%. b.ts: 3 of 3 caught = 100%.
    // Whole report: 4 of 5 caught = 80% (not the mean of the file scores, which is 75%).
    const report: MutationReport = {
      files: {
        "src/b.ts": { mutants: many("Killed", 3) },
        "src/a.ts": { mutants: [mutant("Killed"), mutant("Survived")] },
      },
    };
    const result = scoreReport(report);
    expect(result.score).toBe(80);
    expect(result.files.map((f) => [f.file, f.score])).toEqual([
      ["src/a.ts", 50],
      ["src/b.ts", 100],
    ]);
  });

  test("has no score when nothing counts", () => {
    expect(scoreReport({ files: {} }).score).toBeNull();
    expect(
      scoreReport({ files: { "src/a.ts": { mutants: [mutant("Ignored")] } } }).score,
    ).toBeNull();
  });
});

describe("floorFor", () => {
  test("is the whole-number part of the score, minus 1", () => {
    // 55.68 -> 55 -> 54. 81.70 -> 81 -> 80. 60.00 -> 60 -> 59. 0.4 -> 0 -> -1, kept at 0.
    expect(floorFor(55.68)).toBe(54);
    expect(floorFor(81.7)).toBe(80);
    expect(floorFor(60)).toBe(59);
    expect(floorFor(0.4)).toBe(0);
  });
});

describe("checkScore", () => {
  const at = (score: number) => ({
    counts: {
      killed: 0,
      timeout: 0,
      survived: 0,
      noCoverage: 0,
      errors: 0,
      ignored: 0,
      pending: 0,
      total: 1,
    },
    score,
    files: [],
  });

  test("passes at the floor and fails just under it", () => {
    expect(checkScore(at(54), { floor: 54 }).status).toBe("ok");
    expect(checkScore(at(53.99), { floor: 54 })).toEqual({
      status: "below",
      score: 53.99,
      floor: 54,
    });
  });

  test("suggests a higher floor once the score allows one, and never a lower one", () => {
    // 58.2 -> 58 - 1 = 57, above the floor of 54.
    expect(checkScore(at(58.2), { floor: 54 })).toEqual({
      status: "ok",
      score: 58.2,
      floor: 54,
      suggestedFloor: 57,
    });
    // 54.5 -> 54 - 1 = 53, under the floor of 54: the suggestion stays at 54.
    expect(checkScore(at(54.5), { floor: 54 })).toMatchObject({ suggestedFloor: 54 });
  });

  test("fails a package with no floor, and names the first floor it would get", () => {
    expect(checkScore(at(70.3), undefined)).toEqual({
      status: "no-floor",
      score: 70.3,
      suggestedFloor: 69,
    });
  });

  test("fails a report with no faults that count", () => {
    expect(checkScore({ ...at(0), score: null }, { floor: 10 })).toEqual({ status: "no-faults" });
  });
});

describe("formatSummary", () => {
  const report: MutationReport = {
    files: {
      "src/tax.ts": { mutants: [...many("Killed", 3), ...many("Survived", 2)] },
      "src/debt.ts": { mutants: [mutant("Killed"), mutant("NoCoverage")] },
      "src/clean.ts": { mutants: many("Killed", 4) },
    },
  };

  test("states the score and verdict, and lists files by faults left uncaught", () => {
    // Pooled: caught 3 + 1 + 4 = 8 of 3 + 2 + 1 + 1 + 4 = 11; 8 / 11 = 72.7272...% -> 72.73%.
    const result = scoreReport(report);
    const md = formatSummary("packages/x", result, checkScore(result, { floor: 60 }));
    expect(md).toContain("Score 72.73%. At or above the floor of 60%.");
    expect(md).toContain("| 11 | 8 | 0 | 2 | 1 | 0 | 0 |");
    expect(md).toContain("The floor can rise to 71%");
    // tax.ts has 2 uncaught, debt.ts 1, clean.ts none and is left out.
    expect(md.indexOf("src/tax.ts")).toBeLessThan(md.indexOf("src/debt.ts"));
    expect(md).not.toContain("src/clean.ts");
  });

  test("says plainly when the score is under the floor", () => {
    const result = scoreReport(report);
    expect(formatSummary("packages/x", result, checkScore(result, { floor: 80 }))).toContain(
      "**Below the floor of 80%.**",
    );
  });
});

describe("formatSurvivors", () => {
  test("lists survivors and uncovered faults by file and line, and escapes table pipes", () => {
    const report: MutationReport = {
      files: {
        "src/a.ts": {
          mutants: [
            mutant("Survived", 9, "a || b"),
            mutant("Killed", 3),
            mutant("NoCoverage", 4, "{}"),
          ],
        },
      },
    };
    const md = formatSurvivors("packages/x", report);
    expect(md).toContain("2 not caught");
    expect(md.indexOf("`src/a.ts:4`")).toBeLessThan(md.indexOf("`src/a.ts:9`"));
    expect(md).toContain("| No coverage |");
    expect(md).toContain("`a \\|\\| b`");
    expect(md).not.toContain("`src/a.ts:3`");
  });

  test("says when every fault in the report was caught", () => {
    const md = formatSurvivors("packages/x", {
      files: { "src/a.ts": { mutants: many("Killed", 2) } },
    });
    expect(md).toContain("2 faults, 0 not caught");
    expect(md).not.toContain("| Where |");
  });
});

describe("the committed files", () => {
  test("the engine's mutate list is source only: no tests, fixtures, vectors or barrels", () => {
    const paths = listMutateFiles(
      root,
      "packages/finance-engine",
      readMutateGlobs(root, "packages/finance-engine"),
    );
    expect(paths).toContain("src/mortgage.ts");
    expect(paths).toContain("src/picture/selectors/housing-cost.ts");
    expect(
      paths.filter((p) => /\.test\.ts$|__fixtures__|test-vectors|(^|\/)index\.ts$/.test(p)),
    ).toEqual([]);
  });

  test("the engine's Stryker config mutates the whole package, without tests or fixtures", () => {
    const globs = readMutateGlobs(root, "packages/finance-engine");
    expect(globs).toContain("src/**/*.ts");
    expect(globs).toContain("!src/**/*.{test,spec}.ts");
    expect(globs).toContain("!src/**/__fixtures__/**");
  });

  test("the baseline has a whole-number floor for the engine, under 100 so recorded survivors fit", () => {
    const floor = readBaseline(join(root, "scripts/mutation-baseline.json")).packages[
      "packages/finance-engine"
    ];
    expect(floor).toBeDefined();
    expect(Number.isInteger(floor?.floor)).toBe(true);
    expect(floor?.floor).toBeGreaterThan(0);
    expect(floor?.floor).toBeLessThan(100);
    if (floor?.measured !== undefined)
      expect(floor.floor).toBeLessThanOrEqual(floorFor(floor.measured));
  });

  test("every package with a Stryker config has a floor, so a local run can pass or fail", () => {
    // `bun run mutation all` runs exactly these packages; each must have a floor to check against.
    const baseline = readBaseline(join(root, "scripts/mutation-baseline.json"));
    const configured = configuredPackages(root);
    expect(configured).toContain("packages/finance-engine");
    expect(configured).toContain("apps/backend");
    for (const pkg of configured) expect(baseline.packages[pkg], pkg).toBeDefined();
    // And no floor is left for a package that no longer has a config.
    expect(Object.keys(baseline.packages).sort()).toEqual(configured);
  });

  test("no mutation workflow runs in CI (owner decision, 20 November 2026)", () => {
    // Mutation testing is a local check; a workflow running it again would be a new decision.
    const workflows = [...new Bun.Glob("*.yml").scanSync({ cwd: join(root, ".github/workflows") })];
    for (const file of workflows)
      expect(readFileSync(join(root, ".github/workflows", file), "utf8"), file).not.toMatch(
        /stryker|check-mutation-score|run-mutation/,
      );
  });
});
