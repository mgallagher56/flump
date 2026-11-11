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

export function run(opts: {
  runner: Runner;
  allowFile: string;
  today: string;
  log?: (m: string) => void;
}): number {
  const log = opts.log ?? ((m: string) => console.log(m));
  const { stdout, error } = opts.runner();
  if (error) {
    log(`check-audit: could not run bun audit: ${error}`);
    return 2;
  }
  let report: unknown;
  try {
    report = JSON.parse(stdout);
  } catch {
    log("check-audit: bun audit produced no parseable JSON");
    return 2;
  }
  let allow: AllowEntry[];
  try {
    allow = JSON.parse(readFileSync(opts.allowFile, "utf8"));
    if (!Array.isArray(allow)) throw new Error("not an array");
  } catch (err) {
    log(
      `check-audit: cannot read allow-list ${opts.allowFile}: ${err instanceof Error ? err.message : err}`,
    );
    return 2;
  }
  let result: ReturnType<typeof evaluateAudit>;
  try {
    result = evaluateAudit(report, allow, { threshold: "high", today: opts.today });
  } catch (err) {
    log(`check-audit: ${err instanceof Error ? err.message : err}`);
    return 2;
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
