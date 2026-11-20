/**
 * E41 M1. Reads a Stryker JSON report (mutation-testing-report-schema) and compares its score with
 * the package's floor in scripts/mutation-baseline.json. Owner decision 3 (DECISIONS round 12):
 * one floor per package, set at floor(measured) - 1, like the coverage floors. Raising a floor
 * needs no sign-off; lowering one is a guard change (AGENTS.md section 15).
 *
 * The score is Stryker's own: faults caught (killed or timed out) over every fault that ran or had
 * no test (killed, timed out, survived, no coverage). Compile errors, runtime errors and ignored
 * faults are left out, as Stryker leaves them out. Survivors recorded in the triage ledger
 * (decision 2) stay in the count: nothing here reads the ledger.
 */
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

export type MutantStatus =
  | "Killed"
  | "Survived"
  | "NoCoverage"
  | "Timeout"
  | "CompileError"
  | "RuntimeError"
  | "Ignored"
  | "Pending";

export type Mutant = {
  id: string;
  mutatorName: string;
  replacement?: string;
  status: MutantStatus;
  location: { start: { line: number; column: number }; end: { line: number; column: number } };
};

export type MutationReport = { files: Record<string, { mutants: Mutant[] }> };

type Counts = {
  killed: number;
  timeout: number;
  survived: number;
  noCoverage: number;
  errors: number;
  ignored: number;
  pending: number;
  total: number;
};

type FileScore = { file: string; counts: Counts; score: number | null };

export type ReportScore = { counts: Counts; score: number | null; files: FileScore[] };

export type PackageFloor = { floor: number; measured?: number; measuredOn?: string };

export type Baseline = { packages: Record<string, PackageFloor> };

export type CheckResult =
  | { status: "ok"; score: number; floor: number; suggestedFloor: number }
  | { status: "below"; score: number; floor: number }
  | { status: "no-floor"; score: number | null; suggestedFloor: number | null }
  | { status: "no-faults" };

function emptyCounts(): Counts {
  return {
    killed: 0,
    timeout: 0,
    survived: 0,
    noCoverage: 0,
    errors: 0,
    ignored: 0,
    pending: 0,
    total: 0,
  };
}

function add(counts: Counts, status: MutantStatus): void {
  counts.total++;
  if (status === "Killed") counts.killed++;
  else if (status === "Timeout") counts.timeout++;
  else if (status === "Survived") counts.survived++;
  else if (status === "NoCoverage") counts.noCoverage++;
  else if (status === "CompileError" || status === "RuntimeError") counts.errors++;
  else if (status === "Ignored") counts.ignored++;
  else counts.pending++;
}

/** Stryker's mutation score in percent, or null when no fault counts towards it. */
function scoreOf(counts: Counts): number | null {
  const detected = counts.killed + counts.timeout;
  const valid = detected + counts.survived + counts.noCoverage;
  return valid === 0 ? null : (detected / valid) * 100;
}

export function scoreReport(report: MutationReport): ReportScore {
  const all = emptyCounts();
  const files: FileScore[] = [];
  for (const [file, { mutants }] of Object.entries(report.files).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const counts = emptyCounts();
    for (const mutant of mutants) {
      add(counts, mutant.status);
      add(all, mutant.status);
    }
    files.push({ file, counts, score: scoreOf(counts) });
  }
  return { counts: all, score: scoreOf(all), files };
}

/** floor(measured) - 1, the same rule as the coverage floors (owner decision D6-a, E41 decision 3). */
export function floorFor(score: number): number {
  return Math.max(0, Math.floor(score) - 1);
}

export function checkScore(result: ReportScore, floor: PackageFloor | undefined): CheckResult {
  if (result.score === null) return { status: "no-faults" };
  if (!floor)
    return { status: "no-floor", score: result.score, suggestedFloor: floorFor(result.score) };
  if (result.score < floor.floor)
    return { status: "below", score: result.score, floor: floor.floor };
  return {
    status: "ok",
    score: result.score,
    floor: floor.floor,
    suggestedFloor: Math.max(floor.floor, floorFor(result.score)),
  };
}

export function readReport(path: string): MutationReport {
  return JSON.parse(readFileSync(path, "utf8")) as MutationReport;
}

export function readBaseline(path: string): Baseline {
  return JSON.parse(readFileSync(path, "utf8")) as Baseline;
}

const pct = (score: number | null) => (score === null ? "n/a" : `${score.toFixed(2)}%`);

/** Markdown summary of a run: the package line, then files ordered by faults left uncaught. */
export function formatSummary(
  pkg: string,
  result: ReportScore,
  check: CheckResult,
  top = 15,
): string {
  const c = result.counts;
  const verdict =
    check.status === "ok"
      ? `At or above the floor of ${check.floor}%.`
      : check.status === "below"
        ? `**Below the floor of ${check.floor}%.** Write the missing tests; lowering the floor is a guard change.`
        : check.status === "no-floor"
          ? `No floor in scripts/mutation-baseline.json yet. A first floor would be ${check.suggestedFloor}%.`
          : "**The report has no faults that count towards a score.**";
  const lines = [
    `### Mutation score: ${pkg}`,
    "",
    `Score ${pct(result.score)}. ${verdict}`,
    "",
    "| Faults | Killed | Timed out | Survived | No coverage | Errors | Ignored |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${c.total} | ${c.killed} | ${c.timeout} | ${c.survived} | ${c.noCoverage} | ${c.errors} | ${c.ignored} |`,
  ];
  if (check.status === "ok" && check.suggestedFloor > check.floor)
    lines.push(
      "",
      `The floor can rise to ${check.suggestedFloor}% (floor of the score, minus 1). Raising it needs no sign-off.`,
    );
  const worst = result.files
    .filter((f) => f.counts.survived + f.counts.noCoverage > 0)
    .sort(
      (a, b) =>
        b.counts.survived + b.counts.noCoverage - (a.counts.survived + a.counts.noCoverage) ||
        a.file.localeCompare(b.file),
    )
    .slice(0, top);
  if (worst.length > 0) {
    lines.push(
      "",
      `Files with the most faults no test caught (top ${worst.length} of ${result.files.length}):`,
      "",
      "| File | Score | Survived | No coverage |",
      "| --- | ---: | ---: | ---: |",
      ...worst.map(
        (f) =>
          `| \`${f.file}\` | ${pct(f.score)} | ${f.counts.survived} | ${f.counts.noCoverage} |`,
      ),
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Markdown listing every survivor and uncovered fault, for triage after a local run. */
export function formatSurvivors(pkg: string, report: MutationReport, limit = 200): string {
  const rows: string[] = [];
  let count = 0;
  for (const [file, { mutants }] of Object.entries(report.files).sort(([a], [b]) =>
    a.localeCompare(b),
  ))
    for (const m of [...mutants].sort((a, b) => a.location.start.line - b.location.start.line)) {
      if (m.status !== "Survived" && m.status !== "NoCoverage") continue;
      count++;
      if (rows.length >= limit) continue;
      const replacement = (m.replacement ?? "")
        .replace(/\s+/g, " ")
        .replace(/\|/g, "\\|")
        .slice(0, 80);
      rows.push(
        `| \`${file}:${m.location.start.line}\` | ${m.status === "Survived" ? "Survived" : "No coverage"} | ${m.mutatorName} | \`${replacement}\` |`,
      );
    }
  const score = scoreReport(report);
  const head = [
    `### Faults no test caught: ${pkg}`,
    "",
    "Triage them as in docs/testing/mutation-testing.md; a survivor is not always a missing test, and recorded ones are in docs/testing/mutation-triage.md.",
    "",
    `Score on these files ${pct(score.score)}: ${score.counts.total} faults, ${count} not caught.`,
  ];
  if (count === 0) return `${head.join("\n")}\n`;
  return `${[
    ...head,
    "",
    "| Where | Result | Fault | Replacement |",
    "| --- | --- | --- | --- |",
    ...rows,
    ...(count > rows.length
      ? ["", `${count - rows.length} more not shown; see the HTML report.`]
      : []),
  ].join("\n")}\n`;
}

/** True for a package-relative path that Stryker's `mutate` globs select. */
function mutateMatcher(mutate: string[]): (path: string) => boolean {
  const include = mutate.filter((p) => !p.startsWith("!")).map((p) => new Bun.Glob(p));
  const exclude = mutate.filter((p) => p.startsWith("!")).map((p) => new Bun.Glob(p.slice(1)));
  return (p) => include.some((g) => g.match(p)) && !exclude.some((g) => g.match(p));
}

/** Every file in the package that the `mutate` globs select, package-relative and sorted. */
export function listMutateFiles(root: string, packageDir: string, mutate: string[]): string[] {
  const cwd = join(root, packageDir);
  const matches = mutateMatcher(mutate);
  const paths = new Set<string>();
  for (const pattern of mutate.filter((p) => !p.startsWith("!")))
    for (const path of new Bun.Glob(pattern).scanSync({ cwd })) if (matches(path)) paths.add(path);
  return [...paths].sort();
}

export function readMutateGlobs(root: string, packageDir: string): string[] {
  const config = JSON.parse(
    readFileSync(join(root, packageDir, "stryker.config.json"), "utf8"),
  ) as { mutate?: string[] };
  if (!config.mutate || config.mutate.length === 0)
    throw new Error(
      `${relative(root, join(root, packageDir))}/stryker.config.json has no mutate list`,
    );
  return config.mutate;
}

/**
 * Every package with a Stryker config, as folders relative to the repository root
 * (`packages/mcp`, `apps/backend`), sorted. These are the packages `bun run mutation all` runs.
 */
export function configuredPackages(root: string): string[] {
  return [...new Bun.Glob("{packages,apps}/*/stryker.config.json").scanSync({ cwd: root })]
    .map((path) => path.replace(/\/stryker\.config\.json$/, ""))
    .sort();
}
