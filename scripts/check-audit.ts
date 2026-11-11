import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type AllowEntry, evaluateAudit } from "./lib/audit";

export type Runner = () => { stdout: string; error?: string };

const repoRoot = resolve(import.meta.dir, "..");

/** Runs `bun audit --json`. AUDIT_COMMAND_JSON_FILE substitutes a file for tests. */
export function defaultRunner(env: Record<string, string | undefined> = process.env): Runner {
  return () => {
    const file = env.AUDIT_COMMAND_JSON_FILE;
    if (file) {
      if (!existsSync(file))
        return { stdout: "", error: `AUDIT_COMMAND_JSON_FILE not found: ${file}` };
      return { stdout: readFileSync(file, "utf8") };
    }
    try {
      const proc = Bun.spawnSync(["bun", "audit", "--json"], {
        cwd: repoRoot,
        stdout: "pipe",
        stderr: "pipe",
      });
      // A non-zero exit just means advisories were found; stdout is still the report.
      return { stdout: proc.stdout.toString() };
    } catch (err) {
      return { stdout: "", error: err instanceof Error ? err.message : String(err) };
    }
  };
}

/** Pause before the single registry retry (ms). */
export const RETRY_DELAY_MS = 10_000;

/**
 * Exit codes: 0 clean, 1 real advisory failures, 2 no usable report (registry outage),
 * 3 configuration/shape bug (bad allow-list, unrecognised report shape): never an outage,
 * so CI fails on it. A run that produced
 * no usable JSON is retried once after `retryDelayMs`; JSON that parsed is never retried.
 */
export function run(opts: {
  runner: Runner;
  allowFile: string;
  today: string;
  log?: (m: string) => void;
  sleep?: (ms: number) => void;
  retryDelayMs?: number;
}): number {
  const log = opts.log ?? ((m: string) => console.log(m));
  const sleep = opts.sleep ?? ((ms: number) => Bun.sleepSync(ms));
  const delay = opts.retryDelayMs ?? RETRY_DELAY_MS;

  const attempt = (): { report: unknown } | { failure: string } => {
    const { stdout, error } = opts.runner();
    if (error) return { failure: `could not run bun audit: ${error}` };
    try {
      return { report: JSON.parse(stdout) };
    } catch {
      return { failure: "bun audit produced no parseable JSON" };
    }
  };

  let outcome = attempt();
  if ("failure" in outcome) {
    log(`check-audit: ${outcome.failure}; retrying once in ${delay}ms`);
    sleep(delay);
    outcome = attempt();
    if ("failure" in outcome) {
      log(`check-audit: ${outcome.failure} (after retry)`);
      return 2;
    }
  }
  const report = outcome.report;
  let allow: AllowEntry[];
  try {
    allow = JSON.parse(readFileSync(opts.allowFile, "utf8"));
    if (!Array.isArray(allow)) throw new Error("not an array");
  } catch (err) {
    log(
      `check-audit: cannot read allow-list ${opts.allowFile}: ${err instanceof Error ? err.message : err}`,
    );
    return 3;
  }
  let result: ReturnType<typeof evaluateAudit>;
  try {
    result = evaluateAudit(report, allow, { threshold: "high", today: opts.today });
  } catch (err) {
    log(`check-audit: ${err instanceof Error ? err.message : err}`);
    return 3;
  }
  for (const w of result.warnings) log(`warning: ${w}`);
  for (const f of result.failures) log(`FAIL: ${f}`);
  if (result.failures.length > 0) return 1;
  log("check-audit: no high or critical advisories outside the allow-list");
  return 0;
}

if (import.meta.main) {
  const allowFile = process.argv[2] ?? resolve(repoRoot, "audit-allowlist.json");
  process.exit(
    run({ runner: defaultRunner(), allowFile, today: new Date().toISOString().slice(0, 10) }),
  );
}
