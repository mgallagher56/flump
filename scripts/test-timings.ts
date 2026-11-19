/**
 * Re-takes the test-speed figures (E41 slice P0), so a later change can be compared with the
 * baseline in docs/testing/test-speed-baseline.md. Needs no secret: CI data comes from the `gh`
 * CLI the developer is already signed in to, local data from running Vitest here.
 *
 *   bun scripts/test-timings.ts vitest <report.json> [--text <output.txt>] [--label <name>]
 *   bun scripts/test-timings.ts run <package-dir> [--project <name>] [--out <dir>]
 *   bun scripts/test-timings.ts ci [--workflow ci-pipeline.yml] [--limit 20] [--logs]
 *                                  [--branch <name>] [--json-out <file>]
 *   bun scripts/test-timings.ts playwright <report.json | job-log.txt>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ciMarkdown,
  countTurboCache,
  formatSeconds,
  type JobInfo,
  parseDurationLine,
  parsePlaywrightJson,
  parsePlaywrightLogSummary,
  parseVitestJson,
  playwrightCacheState,
  type RunInfo,
  summariseRuns,
  vitestMarkdown,
} from "./lib/test-timings";

const repoRoot = resolve(import.meta.dir, "..");

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function gh(args: string[]): Promise<string> {
  const proc = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  if ((await proc.exited) !== 0) throw new Error(`gh ${args.join(" ")}: ${err}`);
  return out;
}

function cmdVitest(args: string[]): void {
  const file = args[0];
  if (!file) throw new Error("usage: vitest <report.json> [--text <file>] [--label <name>]");
  const json = JSON.parse(readFileSync(file, "utf8"));
  const textFile = flag(args, "text");
  const split = textFile ? parseDurationLine(readFileSync(textFile, "utf8")) : null;
  console.log(vitestMarkdown(flag(args, "label") ?? file, parseVitestJson(json, repoRoot), split));
}

/** Runs one package's tests with both the default and JSON reporters, then prints the figures. */
function cmdRun(args: string[]): void {
  const dir = args[0];
  if (!dir) throw new Error("usage: run <package-dir> [--project <name>] [--out <dir>]");
  const cwd = resolve(repoRoot, dir);
  const out = resolve(flag(args, "out") ?? join(repoRoot, "test-timings-out"));
  mkdirSync(out, { recursive: true });
  const slug = dir.replace(/[^a-z0-9]+/gi, "-");
  const jsonPath = join(out, `${slug}.json`);
  const project = flag(args, "project");
  const cmd = [
    "bunx",
    "vitest",
    "run",
    ...(project ? ["--project", project] : []),
    "--reporter=default",
    "--reporter=json",
    `--outputFile.json=${jsonPath}`,
  ];
  const started = Date.now();
  const proc = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const elapsed = Date.now() - started;
  const text = proc.stdout.toString() + proc.stderr.toString();
  writeFileSync(join(out, `${slug}.txt`), text);
  // A package config can set its own `outputFile` (apps/web writes to sonar-report.xml), which wins
  // over the flag. Vitest still prints where the JSON went, so follow that line.
  const written = text.match(/JSON report written to (.+)/)?.[1]?.trim();
  const reportPath = existsSync(jsonPath) ? jsonPath : written;
  if (!reportPath || !existsSync(reportPath)) {
    throw new Error(`no JSON report written; exit ${proc.exitCode}`);
  }
  const summary = parseVitestJson(JSON.parse(readFileSync(reportPath, "utf8")), repoRoot);
  console.log(`Command wall time (including start-up): ${formatSeconds(elapsed)}`);
  console.log(vitestMarkdown(dir, summary, parseDurationLine(text)));
}

interface CollectedJob extends JobInfo {
  id: number;
  turbo?: { hit: number; miss: number };
  playwrightCache?: "hit" | "miss" | null;
}

interface CollectedRun extends RunInfo {
  branch: string;
  createdAt: string;
  jobs: CollectedJob[];
}

const LOG_JOBS = /Vitest|Build|Lint|Storybook|E2E/;
const POOL = 6;

async function inPool<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: POOL }, worker));
  return results;
}

async function cmdCi(args: string[]): Promise<void> {
  const workflow = flag(args, "workflow") ?? "ci-pipeline.yml";
  const limit = Number(flag(args, "limit") ?? 20);
  const branch = flag(args, "branch");
  const withLogs = args.includes("--logs");
  const list = JSON.parse(
    await gh([
      "run",
      "list",
      "--workflow",
      workflow,
      "--event",
      "pull_request",
      "--limit",
      String(limit * 3),
      "--json",
      "databaseId,conclusion,createdAt,headBranch,status",
      ...(branch ? ["--branch", branch] : []),
    ]),
  ) as { databaseId: number; conclusion: string; createdAt: string; headBranch: string }[];
  // Only finished runs that passed or failed: a cancelled run has no meaningful duration.
  const wanted = list
    .filter((r) => r.conclusion === "success" || r.conclusion === "failure")
    .slice(0, limit);

  const runs = await inPool(wanted, async (r): Promise<CollectedRun> => {
    const view = JSON.parse(await gh(["run", "view", String(r.databaseId), "--json", "jobs"])) as {
      jobs: (CollectedJob & { databaseId: number })[];
    };
    const jobs = view.jobs.map((j) => ({ ...j, id: j.databaseId }));
    if (withLogs) {
      for (const job of jobs) {
        if (!LOG_JOBS.test(job.name) || job.conclusion === "skipped") continue;
        let log = "";
        try {
          log = await gh(["run", "view", String(r.databaseId), "--log", "--job", String(job.id)]);
        } catch {
          continue; // log expired or not yet available
        }
        if (!log.trim()) continue; // GitHub returned no log text for this job
        job.turbo = countTurboCache(log);
        job.playwrightCache = playwrightCacheState(log);
      }
    }
    return {
      id: r.databaseId,
      branch: r.headBranch,
      createdAt: r.createdAt,
      conclusion: r.conclusion,
      jobs,
    };
  });

  const requiredFile = join(repoRoot, ".github", "required-checks.json");
  const required = (
    JSON.parse(readFileSync(requiredFile, "utf8")).checks as { name: string }[]
  ).map((c) => c.name);
  const summary = summariseRuns(runs, required);
  const jsonOut = flag(args, "json-out");
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ summary, runs }, null, 2));
  console.log(ciMarkdown(summary, /Install Chromium|Run |Storybook|Vitest|Setup Bun|Build/));
  if (withLogs) {
    console.log("\nTurbo cache hits per job (hit/miss task counts), per run:");
    for (const run of runs) {
      const bits = run.jobs
        .filter((j) => j.turbo)
        .map((j) => `${j.name}: ${j.turbo?.hit}/${j.turbo?.miss}`);
      console.log(`- ${run.id} (${run.branch}): ${bits.join("; ")}`);
    }
  }
}

function cmdPlaywright(args: string[]): void {
  const file = args[0];
  if (!file) throw new Error("usage: playwright <report.json | job-log.txt>");
  const text = readFileSync(file, "utf8");
  if (file.endsWith(".json")) {
    const s = parsePlaywrightJson(JSON.parse(text));
    console.log(`Wall time ${s.wallMs === null ? "n/a" : formatSeconds(s.wallMs)}`);
    console.log("| Project | Tests | Summed test time |\n| --- | --- | --- |");
    for (const p of s.projects)
      console.log(`| ${p.project} | ${p.tests} | ${formatSeconds(p.testMs)} |`);
    return;
  }
  const s = parsePlaywrightLogSummary(text);
  console.log(
    s
      ? `${s.passed} passed, ${s.failed} failed, wall ${s.wallMs === null ? "n/a" : formatSeconds(s.wallMs)}`
      : "no Playwright summary line found",
  );
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "vitest") cmdVitest(rest);
  else if (command === "run") cmdRun(rest);
  else if (command === "ci") await cmdCi(rest);
  else if (command === "playwright") cmdPlaywright(rest);
  else {
    console.error("usage: bun scripts/test-timings.ts <vitest|run|ci|playwright> ...");
    process.exit(2);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
