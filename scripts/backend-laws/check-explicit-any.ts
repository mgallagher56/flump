/**
 * Backend `noExplicitAny` ratchet (BE-01, tightened in BE-14, M21). Counts explicit `any` per file
 * across the backend and the packages it runs (tests included) with Biome, and fails when any file
 * differs from the committed baseline: more is a regression, fewer means the baseline is stale.
 * After removing an `any`, lower the baseline with:
 *   bun scripts/backend-laws/check-explicit-any.ts --write-baseline
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { COUNTED_ROOTS, compareAnyCounts, countExplicitAny } from "../lib/explicit-any";

const repoRoot = resolve(import.meta.dir, "../..");
const baselinePath = resolve(import.meta.dir, "explicit-any-baseline.json");

const run = spawnSync(
  "bunx",
  [
    "biome",
    "lint",
    "--only=suspicious/noExplicitAny",
    "--reporter=json",
    "--max-diagnostics=none",
    ...COUNTED_ROOTS,
  ],
  { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
let report: unknown;
try {
  report = JSON.parse(run.stdout);
} catch {
  console.error("check-explicit-any: could not parse Biome's JSON report");
  console.error(run.stderr || run.stdout);
  process.exit(2);
}
const counts = countExplicitAny(report as Parameters<typeof countExplicitAny>[0]);
const total = Object.values(counts).reduce((a, b) => a + b, 0);

if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`Wrote ${total} explicit any across ${Object.keys(counts).length} file(s)`);
  process.exit(0);
}

const baseline: Record<string, number> = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : {};
const { increases, decreases } = compareAnyCounts(counts, baseline);
for (const line of increases)
  console.error(`FAIL ${line} (use a real type, \`unknown\` or a zod-inferred type)`);
for (const line of decreases)
  console.error(
    `STALE ${line} (lower it: bun scripts/backend-laws/check-explicit-any.ts --write-baseline)`,
  );
if (increases.length || decreases.length) process.exit(1);
console.log(`check-explicit-any: OK (${total} explicit any in backend code, never more)`);
