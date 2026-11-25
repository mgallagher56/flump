/**
 * Ratchet: a file may not gain local-clock date reads or London formatter copies
 * (scripts/lib/london-dates.ts). Existing ones sit in scripts/london-dates-baseline.json.
 *   bun scripts/check-london-dates.ts                   check against the baseline
 *   bun scripts/check-london-dates.ts --write-baseline  lock in a fall
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareToBaseline } from "./lib/design-tokens";
import { countLocalDateReads, LONDON_DATE_HOME } from "./lib/london-dates";
import { collectFiles, MOBILE_SCAN_DIRS, readSource, repoRoot, SCAN_DIRS } from "./lib/scan";

export const LONDON_DATE_SCAN_DIRS = [
  ...SCAN_DIRS,
  ...MOBILE_SCAN_DIRS,
  "packages/finance-engine/src",
  "packages/mcp/src",
  "apps/backend/src",
  ".claude/skills/verify-flump",
];

const baselinePath = resolve(import.meta.dir, "london-dates-baseline.json");
const counts: Record<string, number> = {};
for (const file of collectFiles(repoRoot, LONDON_DATE_SCAN_DIRS)) {
  const n = countLocalDateReads(readSource(repoRoot, file), file);
  if (n > 0) counts[file] = n;
}

if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(counts).length} file(s) to ${baselinePath}`);
  process.exit(0);
}

const baseline: Record<string, number> = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : {};
const { failures, stale } = compareToBaseline(counts, baseline);
for (const f of failures)
  console.error(
    `FAIL ${f.replace("violation(s)", "local-clock date read(s)")}: read UK dates with getUkCalendarDate from @repo/finance-engine (${LONDON_DATE_HOME}), or londonMonth in apps/web/app/utils/londonMonth.ts, never getMonth/getFullYear/getDate, toISOString().slice, toLocaleDateString without timeZone, or a new Europe/London formatter.`,
  );
for (const s of stale)
  console.log(`IMPROVED ${s} (lock it in: bun scripts/check-london-dates.ts --write-baseline)`);
if (failures.length) process.exit(1);
console.log("check-london-dates: OK");
