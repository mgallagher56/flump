// E16 style-literal ratchet (plan 4.7): raw font sizes, weights above 700, literal motion
// durations and inline `style=` in the apps may only shrink. See scripts/lib/style-literals.ts.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compareToBaseline } from "./lib/design-tokens";
import { collectFiles, readSource, repoRoot } from "./lib/scan";
import {
  countStyleLiterals,
  emptyBaseline,
  isStyleScanExempt,
  STYLE_RULES,
  type StyleBaseline,
} from "./lib/style-literals";

const baselinePath = resolve(import.meta.dir, "style-literals-baseline.json");
const HINTS: Record<(typeof STYLE_RULES)[number], string> = {
  fontSize: "use a textStyle or a fontSizes key (xs to 6xl)",
  fontWeight: "weights stop at 700 (bold)",
  duration: "use the durations and easings tokens",
  inlineStyle: "move the style into a Panda recipe",
};

const counts = emptyBaseline();
for (const file of collectFiles()) {
  if (isStyleScanExempt(file)) continue;
  const c = countStyleLiterals(file, readSource(repoRoot, file));
  for (const rule of STYLE_RULES) if (c[rule] > 0) counts[rule][file] = c[rule];
}

if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
  const total = STYLE_RULES.map((r) => `${r} ${Object.keys(counts[r]).length}`).join(", ");
  console.log(`Wrote ${baselinePath} (files per rule: ${total})`);
  process.exit(0);
}

const baseline: StyleBaseline = existsSync(baselinePath)
  ? { ...emptyBaseline(), ...JSON.parse(readFileSync(baselinePath, "utf8")) }
  : emptyBaseline();

let failed = false;
for (const rule of STYLE_RULES) {
  const { failures, stale } = compareToBaseline(counts[rule], baseline[rule]);
  for (const f of failures) {
    console.error(`FAIL [${rule}] ${f.replace("violation(s)", "literal(s)")}: ${HINTS[rule]}`);
  }
  for (const s of stale) {
    console.error(
      `STALE [${rule}] ${s} (run: bun scripts/check-style-literals.ts --write-baseline)`,
    );
  }
  if (failures.length || stale.length) failed = true;
}
if (failed) process.exit(1);
console.log("check-style-literals: OK");
