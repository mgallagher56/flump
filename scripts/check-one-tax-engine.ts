/**
 * One tax engine law (E25 T15): fails when UK tax arithmetic appears outside the rule functions
 * in packages/finance-engine/src/uk-tax-year.ts. See scripts/lib/one-tax-engine.ts.
 *
 *   bun scripts/check-one-tax-engine.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { checkFile, type OneTaxEngineViolation } from "./lib/one-tax-engine";

const repoRoot = resolve(import.meta.dir, "..");
/** Source the product ships. The parked mobile app is rebuilt from scratch (E12) and left out. */
const ROOTS = [
  "packages/finance-engine/src",
  "packages/mcp/src",
  "packages/ui/src",
  "packages/banking/src",
  "apps/web/app",
  "apps/marketing/src",
  "apps/backend/src",
];
const SKIP_DIR = new Set(["node_modules", "dist", "build", "styled-system", "__fixtures__"]);
const SKIP_FILE = /\.(test|spec|stories|vectors|fixtures)\.tsx?$/;

function* sourceFiles(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIR.has(entry)) yield* sourceFiles(path);
    } else if (/\.tsx?$/.test(entry) && !SKIP_FILE.test(entry)) {
      yield path;
    }
  }
}

const violations: OneTaxEngineViolation[] = [];
let checked = 0;
for (const root of ROOTS) {
  for (const path of sourceFiles(resolve(repoRoot, root))) {
    checked++;
    const file = relative(repoRoot, path).split("\\").join("/");
    violations.push(...checkFile(file, readFileSync(path, "utf8")));
  }
}

for (const v of violations) console.error(`FAIL ${v.file}: ${v.message}`);
if (violations.length > 0) process.exit(1);
console.log(`check-one-tax-engine: OK (${checked} files, one tax engine)`);
