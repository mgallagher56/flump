import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkScore,
  floorFor,
  formatSummary,
  formatSurvivors,
  joinShardReports,
  listMutateFiles,
  type Mutant,
  type MutantStatus,
  type MutationReport,
  mergeReports,
  partitionFiles,
  readBaseline,
  readMutateGlobs,
  scoreReport,
  selectMutateTargets,
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

  test("says when every fault in the changed files was caught", () => {
    const md = formatSurvivors("packages/x", {
      files: { "src/a.ts": { mutants: many("Killed", 2) } },
    });
    expect(md).toContain("2 faults, 0 not caught");
    expect(md).not.toContain("| Where |");
  });
});

describe("selectMutateTargets", () => {
  const globs = [
    "src/**/*.ts",
    "!src/**/*.{test,spec}.ts",
    "!src/**/__fixtures__/**",
    "!src/**/index.ts",
  ];

  test("keeps changed source files in the package and drops tests, fixtures, barrels and other packages", () => {
    const changed = [
      "packages/finance-engine/src/uk-tax.ts",
      "packages/finance-engine/src/uk-tax.test.ts",
      "packages/finance-engine/src/picture/selectors/housing-cost.ts",
      "packages/finance-engine/src/picture/__fixtures__/personas/dan.ts",
      "packages/finance-engine/src/index.ts",
      "packages/finance-engine/README.md",
      "packages/mcp/src/uk-tax.ts",
      "packages/finance-engine/src/uk-tax.ts",
    ];
    expect(selectMutateTargets(changed, "packages/finance-engine", globs)).toEqual([
      "src/picture/selectors/housing-cost.ts",
      "src/uk-tax.ts",
    ]);
  });

  test("is empty when nothing mutable changed", () => {
    expect(selectMutateTargets(["docs/a.md"], "packages/finance-engine", globs)).toEqual([]);
  });
});

describe("partitionFiles", () => {
  test("puts each file, largest first, into the lightest shard so far", () => {
    // Sizes a 50, b 40, c 30, d 20, e 10 into 2 shards. Totals after each step:
    // a -> shard 1 (tie, lower wins): 50 / 0. b -> shard 2: 50 / 40. c -> shard 2: 50 / 70.
    // d -> shard 1: 70 / 70. e -> shard 1 (tie): 80 / 70. So shard 1 = a, d, e; shard 2 = b, c.
    const files = [
      { path: "e.ts", size: 10 },
      { path: "c.ts", size: 30 },
      { path: "a.ts", size: 50 },
      { path: "d.ts", size: 20 },
      { path: "b.ts", size: 40 },
    ];
    expect(partitionFiles(files, 2)).toEqual([
      ["a.ts", "d.ts", "e.ts"],
      ["b.ts", "c.ts"],
    ]);
    expect(partitionFiles(files, 1)).toEqual([["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"]]);
  });

  test("leaves extra shards empty and refuses a shard count under 1", () => {
    expect(partitionFiles([{ path: "a.ts", size: 1 }], 3)).toEqual([["a.ts"], [], []]);
    expect(() => partitionFiles([], 0)).toThrow();
  });

  test("covers every engine file exactly once across the shards", () => {
    const files = listMutateFiles(
      root,
      "packages/finance-engine",
      readMutateGlobs(root, "packages/finance-engine"),
    );
    const shards = partitionFiles(files, 4);
    expect(shards.flat().sort()).toEqual(files.map((f) => f.path));
    for (const shard of shards) expect(shard.length).toBeGreaterThan(0);
  });
});

describe("mergeReports", () => {
  test("joins shard reports and refuses a file reported twice", () => {
    const a: MutationReport = { files: { "src/a.ts": { mutants: [mutant("Killed")] } } };
    const b: MutationReport = { files: { "src/b.ts": { mutants: [mutant("Survived")] } } };
    // 1 caught of 2 = 50%.
    expect(scoreReport(mergeReports([a, b])).score).toBe(50);
    expect(Object.keys(mergeReports([a, b]).files)).toEqual(["src/a.ts", "src/b.ts"]);
    expect(() => mergeReports([a, a])).toThrow("src/a.ts");
  });
});

describe("joinShardReports", () => {
  test("drops files a shard carried over from an earlier run, so a moved file counts once", () => {
    // Sizes a 30, b 20, c 10 into 2 shards: a -> 1 (30/0), b -> 2 (30/20), c -> 2 (30/30).
    // So shard 1 = a, shard 2 = b, c. Shard 1's report still holds c from an earlier run, where
    // c survived; this run c was killed in shard 2. Joined: a killed, b killed, c killed = 100%.
    const files = [
      { path: "a.ts", size: 30 },
      { path: "b.ts", size: 20 },
      { path: "c.ts", size: 10 },
    ];
    const shard1: MutationReport = {
      files: {
        "a.ts": { mutants: [mutant("Killed")] },
        "c.ts": { mutants: [mutant("Survived")] },
      },
    };
    const shard2: MutationReport = {
      files: { "b.ts": { mutants: [mutant("Killed")] }, "c.ts": { mutants: [mutant("Killed")] } },
    };
    expect(() => mergeReports([shard1, shard2])).toThrow("c.ts");
    const joined = joinShardReports([shard1, shard2], files);
    expect(Object.keys(joined.files).sort()).toEqual(["a.ts", "b.ts", "c.ts"]);
    expect(scoreReport(joined).score).toBe(100);
  });
});

describe("the committed files", () => {
  test("the engine's mutate list is source only: no tests, fixtures, vectors or barrels", () => {
    const paths = listMutateFiles(
      root,
      "packages/finance-engine",
      readMutateGlobs(root, "packages/finance-engine"),
    ).map((f) => f.path);
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

  type Step = {
    id?: string;
    name?: string;
    run?: string;
    uses?: string;
    env?: Record<string, string>;
    with?: Record<string, string>;
  };
  type Workflow = {
    on: { schedule: { cron: string }[]; pull_request: { paths: string[] } };
    jobs: Record<
      string,
      {
        "continue-on-error"?: boolean;
        env?: Record<string, string | number>;
        strategy?: { matrix?: Record<string, unknown> };
        steps: Step[];
      }
    >;
  };
  const workflow = Bun.YAML.parse(
    readFileSync(join(root, ".github/workflows/mutation.yml"), "utf8"),
  ) as Workflow;
  const pick = workflow.jobs.plan?.steps.find((s) => s.id === "pick")?.run ?? "";

  test("every weekly cron picks a package, and every picked package has a floor", () => {
    const baseline = readBaseline(join(root, "scripts/mutation-baseline.json"));
    const crons = workflow.on.schedule.map((s) => s.cron);
    expect(crons.length).toBeGreaterThan(0);
    expect(new Set(crons).size).toBe(crons.length);
    for (const cron of crons) expect(pick).toContain(`"${cron}")`);
    const picked = [...pick.matchAll(/packages\/[a-z-]+/g)].map((m) => m[0]);
    expect(picked.length).toBeGreaterThan(0);
    for (const pkg of picked) expect(baseline.packages[pkg], pkg).toBeDefined();
  });

  const runs = (job: string) =>
    (workflow.jobs[job]?.steps ?? []).map((s) => s.run ?? "").join("\n");

  /** A GitHub Actions expression, built so no source string holds the literal. */
  const D = "$";
  const expr = (e: string) => [D, "{{ ", e, " }}"].join("");

  test("the score job reads the shard reports by the names the shards upload them under", () => {
    // Upload name, download pattern and the path the score step reads must agree, or the first
    // weekly run would fail with "No report from shard 1".
    const upload = workflow.jobs.full?.steps.find((s) =>
      s.uses?.startsWith("actions/upload-artifact@"),
    );
    const download = workflow.jobs.score?.steps.find((s) =>
      s.uses?.startsWith("actions/download-artifact@"),
    );
    expect(upload?.with?.name).toBe(
      `mutation-report-${expr("matrix.target.slug")}-shard${expr("matrix.shard")}`,
    );
    expect(download?.with?.pattern).toBe(`mutation-report-${expr("matrix.target.slug")}-shard*`);
    expect(download?.with?.path).toBe("shard-reports");
    expect(upload?.with?.path).toContain("reports/mutation/mutation.json");
    expect(runs("score")).toContain(
      'report="shard-reports/mutation-report-$SLUG-shard$i/mutation.json"',
    );
  });

  test("the weekly run reruns every fault, and only a manual start may reuse saved results", () => {
    const stryker = workflow.jobs.full?.steps.find((s) => s.name === "🧬 Run Stryker");
    expect(stryker?.env?.FORCE).toBe(
      expr("(github.event_name == 'schedule' || inputs.force) && '--force' || ''"),
    );
    expect(stryker?.run).toContain("run $FORCE");
  });

  /** The targets the "Pick packages" step defines, read from its JSON literals. */
  const targets = [...pick.matchAll(/'(\{"package":[^']+\})'/g)].map(
    (m) => JSON.parse(m[1] ?? "") as { package: string; slug: string; shards: number },
  );

  test("each package sets its own shard count, and the shards and score job read it", () => {
    expect(targets.length).toBeGreaterThan(0);
    for (const t of targets) {
      expect(Number.isInteger(t.shards) && t.shards >= 1, t.package).toBe(true);
      // The slug is the folder name: packages/mcp is "mcp", apps/backend is "backend".
      expect(t.slug, t.package).toBe(t.package.split("/").at(-1));
    }
    const full = workflow.jobs.full;
    expect(full?.strategy?.matrix).toEqual({
      include: expr("fromJSON(needs.plan.outputs.shards)"),
    });
    expect(full?.env?.SHARDS).toBe(expr("matrix.target.shards"));
    expect(workflow.jobs.score?.env?.SHARDS).toBe(expr("matrix.target.shards"));
    expect(runs("score")).toContain('for i in $(seq 1 "$SHARDS"); do');
    // One matrix entry per shard, each carrying its target.
    expect(pick).toContain("range(1; $t.shards + 1) | {target: $t, shard: .}");
  });

  test("every package with a Stryker config is picked, watched on pull requests and floored", () => {
    const baseline = readBaseline(join(root, "scripts/mutation-baseline.json"));
    const configured = [
      ...new Bun.Glob("{packages,apps}/*/stryker.config.json").scanSync({ cwd: root }),
    ]
      .map((p) => p.replace("/stryker.config.json", ""))
      .sort();
    expect(targets.map((t) => t.package).sort()).toEqual(configured);
    expect(
      String(workflow.jobs.changed?.env?.PACKAGES).split(/\s+/).filter(Boolean).sort(),
    ).toEqual(configured);
    for (const pkg of configured) {
      expect(baseline.packages[pkg], pkg).toBeDefined();
      expect(workflow.on.pull_request.paths).toContain(`${pkg}/src/**`);
      expect(workflow.on.pull_request.paths).toContain(`${pkg}/stryker.config.json`);
      expect(workflow.on.pull_request.paths).toContain(`${pkg}/vitest.config.ts`);
      // A manual start can pick the package by its folder.
      expect(pick).toContain(`${pkg}) targets=`);
    }
  });

  test("the pull request job is advisory and only the weekly score job checks the floor", () => {
    expect(workflow.jobs.changed?.["continue-on-error"]).toBe(true);
    expect(workflow.jobs.full?.["continue-on-error"]).toBeUndefined();
    expect(workflow.jobs.score?.["continue-on-error"]).toBeUndefined();
    expect(runs("score")).toContain("check-mutation-score.ts check");
    expect(runs("full")).not.toContain("check-mutation-score.ts check");
    expect(runs("changed")).not.toContain("check-mutation-score.ts check");
    // A pull request never touches the weekly shards' incremental caches.
    expect(workflow.jobs.changed?.steps.some((s) => s.uses?.startsWith("actions/cache"))).toBe(
      false,
    );
  });

  test("the mutation workflow is not a required check", () => {
    const required = JSON.parse(
      readFileSync(join(root, ".github/required-checks.json"), "utf8"),
    ) as {
      checks: { workflow: string }[];
    };
    expect(required.checks.map((c) => c.workflow)).not.toContain("mutation.yml");
  });
});
