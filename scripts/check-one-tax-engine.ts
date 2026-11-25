/**
 * One tax engine law (E25 T15): fails when UK tax arithmetic appears outside the rule functions
 * in packages/finance-engine/src/uk-tax-year.ts. See scripts/lib/one-tax-engine.ts.
 * Also fails on any runtime import cycle inside packages/finance-engine/src, so the one engine
 * initialises in a fixed order (Metro warns on cycles). See scripts/lib/import-cycles.ts.
 *
 *   bun scripts/check-one-tax-engine.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { findImportCycles, importCycleMessage } from "./lib/import-cycles";
import { checkFile, type OneTaxEngineViolation } from "./lib/one-tax-engine";
import { MOBILE_SCAN_DIRS } from "./lib/scan";

const repoRoot = resolve(import.meta.dir, "..");
/** Source the product ships. */
const ROOTS = [
  "packages/finance-engine/src",
  "packages/mcp/src",
  "packages/ui/src",
  "packages/banking/src",
  "apps/web/app",
  "apps/marketing/src",
  "apps/backend/src",
  ...MOBILE_SCAN_DIRS,
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

const ENGINE_SRC = "packages/finance-engine/src";

function* engineModules(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "node_modules" && entry !== "dist") yield* engineModules(path);
    } else if (/\.tsx?$/.test(entry)) {
      yield path;
    }
  }
}

const engineRoot = resolve(repoRoot, ENGINE_SRC);
const engineFiles = new Map<string, string>();
for (const path of engineModules(engineRoot)) {
  engineFiles.set(relative(engineRoot, path).split("\\").join("/"), readFileSync(path, "utf8"));
}
// Every engine file is scanned, tests, fixtures and vectors included: no exclusions, no allow-list.
// With verbatimModuleSyntax an import of type specifiers only is kept, so it then counts.
const tsconfigs = ["packages/typescript-config/base.json", "packages/finance-engine/tsconfig.json"];
const keepTypeSpecifierImports = tsconfigs.some((p) =>
  /"verbatimModuleSyntax"\s*:\s*true/.test(readFileSync(resolve(repoRoot, p), "utf8")),
);
for (const cycle of findImportCycles(engineFiles, { keepTypeSpecifierImports })) {
  violations.push({ file: ENGINE_SRC, message: importCycleMessage(cycle) });
}

for (const v of violations) console.error(`FAIL ${v.file}: ${v.message}`);
if (violations.length > 0) process.exit(1);
console.log(
  `check-one-tax-engine: OK (${checked} files, one tax engine; ${engineFiles.size} engine modules, no import cycles)`,
);
