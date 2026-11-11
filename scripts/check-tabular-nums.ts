import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectFiles, readSource, repoRoot } from "./lib/scan";
import { needsTabular } from "./lib/tabular-nums";

// AGENTS.md section 1 keeps recipes in Foo.styles.ts, so a tabular marker there counts for Foo.tsx.
function withSiblingStyles(file: string): string {
  const source = readSource(repoRoot, file);
  const styles = file.replace(/\.tsx$/, ".styles.ts");
  return existsSync(resolve(repoRoot, styles))
    ? `${source}\n${readSource(repoRoot, styles)}`
    : source;
}

const baselinePath = resolve(import.meta.dir, "tabular-baseline.txt");
const offenders = collectFiles()
  .filter((f) => f.endsWith(".tsx") && needsTabular(withSiblingStyles(f)))
  .sort();

if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselinePath, offenders.length ? `${offenders.join("\n")}\n` : "");
  console.log(`Wrote ${offenders.length} file(s) to ${baselinePath}`);
  process.exit(0);
}

const baseline = existsSync(baselinePath)
  ? readFileSync(baselinePath, "utf8").split("\n").filter(Boolean)
  : [];
const added = offenders.filter((f) => !baseline.includes(f));
const stale = baseline.filter((f) => !offenders.includes(f));
for (const f of added) console.error(`FAIL ${f}: formats numbers without tabular-nums`);
for (const f of stale)
  console.error(
    `STALE ${f}: now compliant or gone (run: bun scripts/check-tabular-nums.ts --write-baseline)`,
  );
if (added.length || stale.length) process.exit(1);
console.log("check-tabular-nums: OK");
