/**
 * Restore-drill freshness law (BE-03, finding H1): an untested backup is not a backup.
 *
 * Reads docs/runbooks/drill-log.md and fails when the newest PASSING drill is older than
 * MAX_AGE_DAYS. Until the first drill is logged it passes with a warning, but only up to
 * FIRST_DRILL_DUE; after that date an empty log fails too.
 *
 * Entry format (the template in drill-log.md): a heading `### YYYY-MM-DD HH:MM UTC - <reason>`
 * under `## Entries`, with a line `Result (pass/fail): pass`.
 *
 * Usage: bun scripts/backend-laws/check-restore-drill.ts [--now YYYY-MM-DD]
 * Exit: 0 ok, 1 stale or missing drill.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MAX_AGE_DAYS = 90;
/** The owner runs the first drill before this date (docs/audit/backend-2026-11/OWNER-SETUP.md). */
export const FIRST_DRILL_DUE = "2026-12-15";

export interface DrillEntry {
  date: string; // YYYY-MM-DD
  reason: string;
  result: "pass" | "fail" | "unknown";
}

const HEADING = /^###\s+(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}\s+UTC\s+-\s+(.+?)\s*$/;
const RESULT = /^Result \(pass\/fail\):\s*(\S*)/i;

export function parseDrillLog(markdown: string): DrillEntry[] {
  const start = markdown.search(/^## Entries\s*$/m);
  if (start === -1) throw new Error("drill-log.md has no '## Entries' section");
  const entries: DrillEntry[] = [];
  let current: DrillEntry | undefined;
  for (const line of markdown.slice(start).split("\n")) {
    const heading = line.match(HEADING);
    if (heading) {
      current = { date: heading[1], reason: heading[2], result: "unknown" };
      if (Number.isNaN(Date.parse(`${current.date}T00:00:00Z`))) {
        throw new Error(`drill-log.md has an invalid date: ${current.date}`);
      }
      entries.push(current);
      continue;
    }
    const result = line.trim().match(RESULT);
    if (result && current) {
      const value = result[1].toLowerCase();
      current.result = value === "pass" || value === "fail" ? value : "unknown";
    }
  }
  return entries;
}

export interface FreshnessVerdict {
  ok: boolean;
  message: string;
}

const DAY_MS = 86_400_000;

export function checkFreshness(
  entries: DrillEntry[],
  now: Date,
  maxAgeDays = MAX_AGE_DAYS,
  firstDue = FIRST_DRILL_DUE,
): FreshnessVerdict {
  const today = now.toISOString().slice(0, 10);
  const future = entries.find((e) => e.date > today);
  if (future) {
    return {
      ok: false,
      message: `Restore drill law FAILED: drill-log.md has an entry dated ${future.date}, after today (${today}). Fix the date.`,
    };
  }
  const passing = entries
    .filter((e) => e.result === "pass")
    .map((e) => e.date)
    .sort();
  if (passing.length === 0) {
    if (today < firstDue) {
      return {
        ok: true,
        message: `WARNING: no passing restore drill logged yet; the first is due by ${firstDue} (docs/runbooks/backup-restore.md, "Restore drill").`,
      };
    }
    return {
      ok: false,
      message: `Restore drill law FAILED: no passing drill in docs/runbooks/drill-log.md and the first was due by ${firstDue}. Run the drill (docs/runbooks/backup-restore.md) and log it.`,
    };
  }
  const last = passing.at(-1) as string;
  const ageDays = Math.floor(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / DAY_MS,
  );
  if (ageDays > maxAgeDays) {
    return {
      ok: false,
      message: `Restore drill law FAILED: the last passing drill was ${last}, ${ageDays} days ago (limit ${maxAgeDays}). Run the drill (docs/runbooks/backup-restore.md) and log it.`,
    };
  }
  return {
    ok: true,
    message: `Restore drill law: last passing drill ${last} (${ageDays} days ago, limit ${maxAgeDays}).`,
  };
}

if (import.meta.main) {
  const nowArg = process.argv.indexOf("--now");
  const nowValue = nowArg > -1 ? process.argv[nowArg + 1] : undefined;
  if (nowArg > -1 && !/^\d{4}-\d{2}-\d{2}$/.test(nowValue ?? "")) {
    console.error("usage: bun scripts/backend-laws/check-restore-drill.ts [--now YYYY-MM-DD]");
    process.exit(2);
  }
  const now = nowValue ? new Date(`${nowValue}T12:00:00Z`) : new Date();
  if (Number.isNaN(now.getTime())) {
    console.error(`invalid --now date: ${nowValue}`);
    process.exit(2);
  }
  const log = readFileSync(join(import.meta.dir, "../../docs/runbooks/drill-log.md"), "utf8");
  const verdict = checkFreshness(parseDrillLog(log), now);
  // Same policy as the tax-year guard: on a push to main it only warns, so a Railway
  // "Wait for CI" deploy (which may be the fix) is never blocked by the calendar.
  const warnOnly = process.env.GITHUB_EVENT_NAME === "push";
  if (verdict.ok) console.log(verdict.message);
  else
    console.error(
      warnOnly ? `WARNING (push to main, not failing): ${verdict.message}` : verdict.message,
    );
  process.exit(verdict.ok || warnOnly ? 0 : 1);
}
