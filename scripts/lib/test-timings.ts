/**
 * Pure helpers for scripts/test-timings.ts (E41 slice P0). Everything here takes already-read
 * text or parsed JSON, so it can be tested with fixtures and needs no network, no secret and
 * no running suite.
 */

export interface TestFileTiming {
  file: string;
  durationMs: number;
}

export interface VitestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  fileCount: number;
  /** First file start to last file end, from the JSON reporter. */
  wallMs: number;
  files: TestFileTiming[];
}

/** One slice of Vitest's "Duration" line: transform, setup, import, tests, environment, worker. */
export interface DurationSplit {
  totalMs: number;
  parts: { name: string; ms: number }[];
}

interface Stats {
  count: number;
  min: number;
  median: number;
  max: number;
}

export interface JobInfo {
  name: string;
  conclusion: string | null;
  startedAt: string;
  completedAt: string;
  steps: StepInfo[];
}

interface StepInfo {
  name: string;
  conclusion: string | null;
  startedAt: string;
  completedAt: string;
}

export interface RunInfo {
  id: number;
  conclusion: string | null;
  jobs: JobInfo[];
}

interface NamedStats extends Stats {
  name: string;
}

export interface CiSummary {
  runCount: number;
  jobs: NamedStats[];
  steps: NamedStats[];
  /** Wall time per run, first job start to last job end, all jobs. */
  runWall: Stats | null;
  /** Wall time per run, over the required checks only. */
  requiredWall: Stats | null;
  /**
   * The longest single job in each run. Jobs run in parallel, so this is the time a run needs
   * with no queueing and no re-run; wall time above includes both.
   */
  slowestJob: Stats | null;
}

export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid] as number;
  if (sorted.length % 2 === 1) return a;
  return ((sorted[mid - 1] as number) + a) / 2;
}

function stats(values: number[]): Stats | null {
  if (values.length === 0) return null;
  return {
    count: values.length,
    min: Math.min(...values),
    median: median(values),
    max: Math.max(...values),
  };
}

function relativeFile(file: string, root: string): string {
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return file.startsWith(prefix) ? file.slice(prefix.length) : file;
}

interface RawVitestJson {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  testResults?: { name: string; startTime: number; endTime: number }[];
}

/** Reads the object Vitest's `--reporter=json` writes. */
export function parseVitestJson(raw: unknown, root = ""): VitestSummary {
  const json = raw as RawVitestJson;
  const results = json.testResults ?? [];
  const files = results.map((r) => ({
    file: relativeFile(r.name, root),
    durationMs: Math.max(0, r.endTime - r.startTime),
  }));
  const starts = results.map((r) => r.startTime);
  const ends = results.map((r) => r.endTime);
  return {
    totalTests: json.numTotalTests ?? 0,
    passedTests: json.numPassedTests ?? 0,
    failedTests: json.numFailedTests ?? 0,
    fileCount: files.length,
    wallMs: results.length === 0 ? 0 : Math.max(...ends) - Math.min(...starts),
    files,
  };
}

export function slowestFiles(files: TestFileTiming[], n = 20): TestFileTiming[] {
  return [...files].sort((a, b) => b.durationMs - a.durationMs).slice(0, n);
}

const UNIT_MS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };

/** "687ms", "2.5s", "2m 3s" and "1m 5.2s" to milliseconds. */
export function parseHumanDuration(text: string): number | null {
  const re = /(\d+(?:\.\d+)?)\s*(ms|s|m|h)\b/g;
  let total = 0;
  let found = false;
  for (const m of text.matchAll(re)) {
    found = true;
    total += Number(m[1]) * (UNIT_MS[m[2] as string] as number);
  }
  return found ? total : null;
}

/**
 * Reads Vitest's final "Duration" line. Vitest 5 prints shares of the total
 * ("Duration  687ms (import 43%, transform 33%, tests 22%)"); earlier versions printed times
 * ("Duration  3.2s (transform 120ms, setup 0ms, import 1s, tests 500ms, environment 1.2s)").
 * Both are turned into milliseconds. Returns null when no such line is present.
 */
export function parseDurationLine(text: string): DurationSplit | null {
  const line = text.split("\n").find((l) => /^\s*Duration\s+\S/.test(l));
  if (!line) return null;
  const m = line.match(/^\s*Duration\s+(.+?)\s*(?:\((.*)\))?\s*$/);
  if (!m) return null;
  const totalMs = parseHumanDuration(m[1] as string);
  if (totalMs === null) return null;
  const parts: { name: string; ms: number }[] = [];
  for (const piece of (m[2] ?? "").split(",")) {
    const p = piece.trim().match(/^([a-z ]+?)\s+(.+)$/i);
    if (!p) continue;
    const name = (p[1] as string).trim();
    const value = (p[2] as string).trim();
    const pct = value.match(/^(\d+(?:\.\d+)?)%$/);
    if (pct) {
      parts.push({ name, ms: (Number(pct[1]) / 100) * totalMs });
      continue;
    }
    const ms = parseHumanDuration(value);
    if (ms !== null) parts.push({ name, ms });
  }
  return { totalMs, parts };
}

/** Counts Turbo's per-task cache lines in a job log. */
export function countTurboCache(log: string): { hit: number; miss: number } {
  let hit = 0;
  let miss = 0;
  for (const line of log.split("\n")) {
    if (/cache hit, (replaying logs|suppressing logs)/.test(line)) hit += 1;
    else if (/cache miss, executing/.test(line)) miss += 1;
    else if (/cache bypass, force executing/.test(line)) miss += 1;
  }
  return { hit, miss };
}

/**
 * Whether the "Cache Playwright browsers" step restored a cache, read from the text of
 * `gh run view <id> --log --job <id>`, where each line is "job<TAB>step<TAB>text".
 */
export function playwrightCacheState(log: string): "hit" | "miss" | null {
  for (const line of log.split("\n")) {
    const [, step, text] = line.split("\t");
    if (!step || !text || !/Cache Playwright/.test(step) || /^Post /.test(step)) continue;
    if (/Cache hit occurred on the primary key|Cache restored from key/.test(text)) return "hit";
    if (/Cache not found for input keys/.test(text)) return "miss";
  }
  return null;
}

function ms(iso: string): number {
  return Date.parse(iso);
}

function durationMs(start: string, end: string): number | null {
  const a = ms(start);
  const b = ms(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return b - a;
}

/** Job and step names carry an emoji prefix and a matrix suffix; strip nothing, match as printed. */
function collect(into: Map<string, number[]>, name: string, value: number | null): void {
  if (value === null) return;
  const list = into.get(name) ?? [];
  list.push(value);
  into.set(name, list);
}

function toNamed(map: Map<string, number[]>): NamedStats[] {
  const out: NamedStats[] = [];
  for (const [name, values] of map) {
    const s = stats(values);
    if (s) out.push({ name, ...s });
  }
  return out.sort((a, b) => b.median - a.median);
}

/**
 * Summarises completed runs. Skipped jobs and steps are left out, so a step that only runs on
 * some events is counted over the runs where it ran. Cancelled runs are left out by the caller.
 */
export function summariseRuns(runs: RunInfo[], requiredJobNames: string[] = []): CiSummary {
  const jobs = new Map<string, number[]>();
  const steps = new Map<string, number[]>();
  const runWalls: number[] = [];
  const requiredWalls: number[] = [];
  const slowest: number[] = [];
  const required = new Set(requiredJobNames);

  for (const run of runs) {
    const ran = run.jobs.filter((j) => j.conclusion !== "skipped" && j.startedAt && j.completedAt);
    for (const job of ran) {
      collect(jobs, job.name, durationMs(job.startedAt, job.completedAt));
      for (const step of job.steps) {
        if (step.conclusion === "skipped") continue;
        collect(steps, `${job.name} / ${step.name}`, durationMs(step.startedAt, step.completedAt));
      }
    }
    const wall = (list: JobInfo[]): number | null => {
      if (list.length === 0) return null;
      const start = Math.min(...list.map((j) => ms(j.startedAt)));
      const end = Math.max(...list.map((j) => ms(j.completedAt)));
      return end >= start ? end - start : null;
    };
    const longest = Math.max(...ran.map((j) => durationMs(j.startedAt, j.completedAt) ?? 0));
    if (ran.length > 0) slowest.push(longest);
    const all = wall(ran);
    if (all !== null) runWalls.push(all);
    const req = wall(ran.filter((j) => required.has(j.name)));
    if (req !== null) requiredWalls.push(req);
  }

  return {
    runCount: runs.length,
    jobs: toNamed(jobs),
    steps: toNamed(steps),
    runWall: stats(runWalls),
    requiredWall: stats(requiredWalls),
    slowestJob: stats(slowest),
  };
}

interface RawPlaywrightSuite {
  title?: string;
  suites?: RawPlaywrightSuite[];
  specs?: {
    tests?: { projectName?: string; results?: { duration?: number }[] }[];
  }[];
}

interface PlaywrightProject {
  project: string;
  tests: number;
  /** Sum of test durations (not wall time: workers overlap). */
  testMs: number;
}

export interface PlaywrightSummary {
  wallMs: number | null;
  projects: PlaywrightProject[];
}

/** Reads the object Playwright's `--reporter=json` writes. */
export function parsePlaywrightJson(raw: unknown): PlaywrightSummary {
  const json = raw as { stats?: { duration?: number }; suites?: RawPlaywrightSuite[] };
  const byProject = new Map<string, PlaywrightProject>();
  const walk = (suite: RawPlaywrightSuite): void => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const key = test.projectName ?? "(none)";
        const entry = byProject.get(key) ?? { project: key, tests: 0, testMs: 0 };
        entry.tests += 1;
        for (const r of test.results ?? []) entry.testMs += r.duration ?? 0;
        byProject.set(key, entry);
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of json.suites ?? []) walk(suite);
  return {
    wallMs: json.stats?.duration ?? null,
    projects: [...byProject.values()].sort((a, b) => b.testMs - a.testMs),
  };
}

/** Reads Playwright's list-reporter summary from a CI log: "90 passed (1.3m)". */
export function parsePlaywrightLogSummary(
  log: string,
): { passed: number; failed: number; wallMs: number | null } | null {
  let passed = 0;
  let failed = 0;
  let wallMs: number | null = null;
  let found = false;
  for (const line of log.split("\n")) {
    const m = line.match(/^\S*\s*(\d+) passed(?: \(([^)]+)\))?/);
    if (!m) continue;
    found = true;
    passed = Number(m[1]);
    if (m[2]) wallMs = parseHumanDuration(m[2]);
    const f = log.match(/(\d+) failed/);
    failed = f ? Number(f[1]) : 0;
  }
  return found ? { passed, failed, wallMs } : null;
}

export function formatSeconds(valueMs: number): string {
  if (Number.isNaN(valueMs)) return "n/a";
  const s = valueMs / 1000;
  if (s < 10) return `${s.toFixed(1)} s`;
  if (s < 120) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s - m * 60)} s`;
}

function statsRow(name: string, s: Stats): string {
  return `| ${name} | ${s.count} | ${formatSeconds(s.min)} | ${formatSeconds(s.median)} | ${formatSeconds(s.max)} |`;
}

export function ciMarkdown(summary: CiSummary, stepFilter?: RegExp): string {
  const header = "| Name | Runs | Min | Median | Max |\n| --- | --- | --- | --- | --- |";
  const lines: string[] = [`Runs summarised: ${summary.runCount}`, ""];
  if (summary.runWall) {
    lines.push("Whole run (first job start to last job end):", "", header);
    lines.push(statsRow("all jobs", summary.runWall));
    if (summary.requiredWall) lines.push(statsRow("required checks only", summary.requiredWall));
    if (summary.slowestJob) lines.push(statsRow("slowest single job per run", summary.slowestJob));
    lines.push("");
  }
  lines.push("Jobs, slowest median first:", "", header);
  for (const j of summary.jobs) lines.push(statsRow(j.name, j));
  lines.push("", "Steps, slowest median first (top 25):", "", header);
  const steps = stepFilter ? summary.steps.filter((s) => stepFilter.test(s.name)) : summary.steps;
  for (const s of steps.slice(0, 25)) lines.push(statsRow(s.name, s));
  return lines.join("\n");
}

export function vitestMarkdown(
  label: string,
  summary: VitestSummary,
  split: DurationSplit | null,
  top = 20,
): string {
  const lines = [
    `### ${label}`,
    "",
    `${summary.fileCount} files, ${summary.totalTests} tests (${summary.passedTests} passed, ${summary.failedTests} failed). Wall time ${formatSeconds(summary.wallMs)}.`,
    "",
  ];
  if (split) {
    lines.push(
      `Split of ${formatSeconds(split.totalMs)} (shares of the summed worker time, as Vitest prints them):`,
      "",
    );
    lines.push("| Part | Share |", "| --- | --- |");
    const sum = split.parts.reduce((a, p) => a + p.ms, 0);
    for (const p of split.parts) {
      lines.push(`| ${p.name} | ${sum === 0 ? "n/a" : `${Math.round((p.ms / sum) * 100)}%`} |`);
    }
    lines.push("");
  }
  lines.push(`Slowest ${top} files:`, "", "| File | Time |", "| --- | --- |");
  for (const f of slowestFiles(summary.files, top)) {
    lines.push(`| ${f.file} | ${formatSeconds(f.durationMs)} |`);
  }
  return lines.join("\n");
}
