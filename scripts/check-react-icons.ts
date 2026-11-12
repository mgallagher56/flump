import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareToBaseline } from "./lib/design-tokens";
import { countReactIconsImports } from "./lib/react-icons";
import { collectFiles, readSource, repoRoot } from "./lib/scan";

const baselinePath = resolve(import.meta.dir, "react-icons-baseline.json");
const counts: Record<string, number> = {};
for (const file of collectFiles()) {
  const n = countReactIconsImports(readSource(repoRoot, file));
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
  console.error(`FAIL ${f.replace("violation(s)", "react-icons import(s)")}`);
for (const s of stale)
  console.error(`STALE ${s} (run: bun scripts/check-react-icons.ts --write-baseline)`);
if (failures.length || stale.length) process.exit(1);
console.log("check-react-icons: OK");
