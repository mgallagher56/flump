/**
 * One home per value (system audit November 2026, slice 1, owner decision 11).
 *
 * Fails when docs/system/value-map.yaml stops being true:
 * - a column of a table in the user-data registry is not tied to a fact or marked as no fact
 *   (unmapped-column), or the tie names a fact the map does not have;
 * - a browser storage or cookie key in the code is not listed in the map (unmapped-storage-key),
 *   or a listed key is no longer in the code (dead-storage-key);
 * - an entry points at a file, function, table or column that no longer exists (dead-path,
 *   dead-symbol, dead-column);
 * - an entry is malformed (unknown verdict or status, duplicate id, missing field), a fact has no
 *   source of truth, or a shared figure is not computed by one engine function;
 * - the generated views in docs/system/generated are stale (stale-views).
 *
 * Problems known on the day the check was added are in scripts/value-map-baseline.json, each with
 * the audit finding that explains it. The baseline can only shrink: --write-baseline drops entries
 * that are fixed and never adds one.
 *
 * It also prints, as warnings that never fail the run, arithmetic in web, backend and AI tool code
 * that may be a second formula for a shared figure. Warnings in files the baseline lists (with
 * their finding) are summarised; new ones are printed with file and line.
 *
 *   bun scripts/check-value-map.ts                  run the check
 *   bun scripts/check-value-map.ts --verbose        also print every known warning
 *   bun scripts/check-value-map.ts --write-baseline drop fixed entries and lower warning counts
 *
 * How to read and fix each message: docs/system/README.md.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseValueMap, type RepoView, RULES, staleViews, validateMap } from "./lib/value-map";
import {
  type Baseline,
  checkCoverage,
  compareProblems,
  compareWarnings,
  findingIdsIn,
  lowerBaseline,
  validateBaseline,
} from "./lib/value-map-check";
import {
  type EntityInfo,
  type FoundKey,
  findSecondFormulas,
  findStorageKeys,
  readEntities,
  readRegistry,
  type SecondFormulaHit,
} from "./lib/value-map-sources";

const repoRoot = resolve(import.meta.dir, "..");
const MAP = "docs/system/value-map.yaml";
const VIEWS = "docs/system/generated";
const ENTITIES = "apps/backend/src/entities";
const REGISTRY = "apps/backend/src/modules/privacy/user-data-registry.ts";
const FINDINGS = "docs/audit/system-2026-11/FINDINGS.md";
const baselinePath = resolve(import.meta.dir, "value-map-baseline.json");

/** Where browser storage keys are written: the web app, the shared UI, the marketing site and the engine's storage driver. */
const STORAGE_ROOTS = [
  "apps/web/app",
  "packages/ui/src",
  "apps/marketing/src",
  "packages/finance-engine/src",
];
/** Where a second formula would be: web pages, backend services and the AI tools. */
const FORMULA_ROOTS = ["apps/web/app", "apps/backend/src", "packages/mcp/src"];
const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  "styled-system",
  "__fixtures__",
  "__tests__",
  "migrations",
  "test",
  "evals",
]);
const SKIP_FILE = /\.(test|spec|stories|vectors|fixtures|d)\.tsx?$/;

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
const rel = (path: string) => relative(repoRoot, path).split("\\").join("/");
const read = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

// --- Read the map and the code -----------------------------------------------------------------

const map = parseValueMap(read(MAP));

const entities: EntityInfo[] = [];
for (const path of sourceFiles(resolve(repoRoot, ENTITIES)))
  entities.push(...readEntities(rel(path), readFileSync(path, "utf8")));
const tables = new Map(entities.map((e) => [e.table, new Set(e.columns.map((c) => c.column))]));

const repo: RepoView = {
  exists: (path) => existsSync(resolve(repoRoot, path)),
  read: (path) => (existsSync(resolve(repoRoot, path)) ? read(path) : null),
  tables,
};

const foundKeys: FoundKey[] = [];
for (const root of STORAGE_ROOTS)
  for (const path of sourceFiles(resolve(repoRoot, root)))
    foundKeys.push(...findStorageKeys(rel(path), readFileSync(path, "utf8")));

const hits: SecondFormulaHit[] = [];
for (const root of FORMULA_ROOTS)
  for (const path of sourceFiles(resolve(repoRoot, root)))
    hits.push(...findSecondFormulas(rel(path), readFileSync(path, "utf8")));

// --- Structural rules --------------------------------------------------------------------------

const problems = [
  ...validateMap(map, repo),
  ...checkCoverage({ map, entities, registry: readRegistry(REGISTRY, read(REGISTRY)), foundKeys }),
];

/** Formats a view with Biome through stdin, as the generator formats the files on disk. */
const biomeFormat = (name: string, text: string): string => {
  const fmt = spawnSync("bunx", ["biome", "format", `--stdin-file-path=${VIEWS}/${name}`], {
    cwd: repoRoot,
    input: text,
    encoding: "utf8",
  });
  if (fmt.status !== 0) {
    console.error(`check-value-map: Biome could not format ${name}.\n${fmt.stderr}`);
    process.exit(1);
  }
  return fmt.stdout;
};
const stale = staleViews(map, (name) => repo.read(`${VIEWS}/${name}`), biomeFormat);
for (const name of stale)
  problems.push({
    rule: RULES.staleViews,
    subject: name,
    message: `${VIEWS}/${name} is stale or was edited by hand. Run: bun scripts/generate-value-map.ts, and commit the views with the map`,
  });

// --- Baseline ----------------------------------------------------------------------------------

const baseline: Baseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : { problems: {}, secondFormulas: {} };

if (process.argv.includes("--write-baseline")) {
  const next = lowerBaseline(baseline, problems, hits);
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    `Wrote ${rel(baselinePath)}: ${Object.keys(next.problems).length} known problems, ${Object.keys(next.secondFormulas).length} files with known warnings. Entries are only removed or lowered, never added.`,
  );
  process.exit(0);
}

const baselineErrors = validateBaseline(baseline, findingIdsIn(read(FINDINGS)));
const { failures, stale: staleEntries, known } = compareProblems(problems, baseline);
const warnings = compareWarnings(hits, baseline, map);

// --- Report ------------------------------------------------------------------------------------

const verbose = process.argv.includes("--verbose");
for (const w of warnings.fresh)
  console.warn(`WARN ${w.file}:${w.line} [second-formula/${w.rule}] ${w.message}`);
for (const w of warnings.overBaseline) console.warn(`WARN ${w}`);
if (verbose)
  for (const w of warnings.known)
    console.warn(`known ${w.file}:${w.line} [${w.rule}] (${w.findings.join(", ")})`);
for (const line of warnings.improved)
  console.log(`IMPROVED ${line} (run: bun scripts/check-value-map.ts --write-baseline)`);

for (const e of baselineErrors) console.error(`FAIL baseline: ${e}`);
for (const p of failures) console.error(`FAIL [${p.rule}] ${p.message}`);
for (const s of staleEntries)
  console.error(
    `STALE [${s}] is fixed but still in the baseline. Run: bun scripts/check-value-map.ts --write-baseline, and commit scripts/value-map-baseline.json`,
  );

const summary = `${map.facts.length} facts, ${map.figures.length} figures, ${map.browser_storage.length} browser keys, ${entities.length} tables; ${known.length} known problems in the baseline; second-formula warnings: ${warnings.fresh.length} new, ${warnings.known.length} known`;
if (failures.length + staleEntries.length + baselineErrors.length > 0) {
  console.error(
    `check-value-map: FAILED (${summary}). How to fix each message: docs/system/README.md`,
  );
  process.exit(1);
}
console.log(`check-value-map: OK (${summary})`);
