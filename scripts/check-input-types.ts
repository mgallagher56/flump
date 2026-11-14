import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareToBaseline } from "./lib/design-tokens";
import { countNumberInputs } from "./lib/input-types";
import { collectFiles, readSource, repoRoot } from "./lib/scan";

const baselinePath = resolve(import.meta.dir, "input-types-baseline.json");
const counts: Record<string, number> = {};
for (const file of collectFiles()) {
  const n = countNumberInputs(readSource(repoRoot, file));
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
    `FAIL ${f.replace("violation(s)", 'type="number" input(s)')}: use CurrencyInput, PercentInput or TextInput with inputMode (UX-GUIDELINES F2)`,
  );
// A fall is not a failure here: many open PRs remove these at once, and failing each of them as
// STALE (as check-react-icons does) would only cause baseline merge conflicts. The count still
// cannot rise. Tighten the baseline with --write-baseline whenever it is convenient.
for (const s of stale)
  console.log(`IMPROVED ${s} (lock it in: bun scripts/check-input-types.ts --write-baseline)`);
if (failures.length) process.exit(1);
console.log("check-input-types: OK");
