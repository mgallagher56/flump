/**
 * Ratchet: no tracked Markdown file (docs, plans, agent rules, skills) may gain an em dash
 * (AGENTS.md section 11; app strings are checked by scripts/check-copy.ts). Existing ones sit in
 * scripts/doc-dashes-baseline.json; the agent instruction files are at zero.
 *   bun scripts/check-doc-dashes.ts                   check against the baseline
 *   bun scripts/check-doc-dashes.ts --write-baseline  lock in a fall
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { baselineRaises } from "./lib/baseline-vs-main";
import { compareToBaseline } from "./lib/design-tokens";
import { countEmDashes, isDashCheckedFile } from "./lib/doc-dashes";
import { repoRoot } from "./lib/scan";

const tracked = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { cwd: repoRoot, encoding: "utf8" },
)
  .split("\0")
  .filter(isDashCheckedFile);

const counts: Record<string, number> = {};
for (const file of tracked) {
  const path = join(repoRoot, file);
  if (!existsSync(path)) continue;
  const n = countEmDashes(readFileSync(path, "utf8"));
  if (n > 0) counts[file] = n;
}

const baselinePath = resolve(import.meta.dir, "doc-dashes-baseline.json");
if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(counts).length} file(s) to ${baselinePath}`);
  process.exit(0);
}

const baseline: Record<string, number> = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : {};
const { failures, stale } = compareToBaseline(counts, baseline);
// The baseline itself may only shrink: an allowance new or higher than on main fails.
const vsMain = baselineRaises("scripts/doc-dashes-baseline.json", baseline);
if (vsMain.skipped) console.log(`Baseline comparison with main skipped: ${vsMain.skipped}`);
for (const r of vsMain.raises)
  console.error(
    `scripts/doc-dashes-baseline.json raises ${r}. Baselines may only shrink; remove the em dashes instead (a raise needs the coordinator's sign-off, AGENTS.md section 15).`,
  );
for (const f of failures)
  console.error(
    `FAIL ${f.replace("violation(s)", "em dash(es)")}: use a colon, a comma, a full stop or brackets instead (AGENTS.md section 11). List them with: grep -n "—" <file>`,
  );
for (const s of stale)
  console.log(`IMPROVED ${s} (lock it in: bun scripts/check-doc-dashes.ts --write-baseline)`);
if (failures.length || vsMain.raises.length) process.exit(1);
console.log("check-doc-dashes: OK");
