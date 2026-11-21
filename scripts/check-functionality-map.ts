/**
 * Guard for docs/system/functionality-map/ (E43, part of check:laws).
 *
 * Fails when:
 * - index.yaml or any pages/{web|marketing}/*.yaml is malformed or has duplicate IDs;
 * - a route_file, component, or excluded/allowlisted path does not exist in the repo;
 * - any capability's facts_read, facts_written, or figures_shown references an unknown ID in
 *   docs/system/value-map.yaml;
 * - generated views in docs/system/functionality-map/generated/ are stale;
 * - unmapped_allowlist contains dead or already-mapped entries, or (when unmapped_allowlist is
 *   removed in S4) any discovered route is unmapped.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  FM_RULES,
  staleFunctionalityViews,
  validateFunctionalityMap,
} from "./lib/functionality-map";
import {
  createRepoView,
  discoverAllRoutes,
  FM_VIEWS_DIR,
  loadFunctionalityMap,
} from "./lib/functionality-map-fs";

const repoRoot = resolve(import.meta.dir, "..");
const repo = createRepoView(repoRoot);
const { index, pages, valueMap } = loadFunctionalityMap(repoRoot);
const discoveredRoutes = discoverAllRoutes(repoRoot, repo);

const problems = validateFunctionalityMap({
  index,
  pages,
  repo,
  valueMap,
  discoveredRoutes,
});

const biomeFormat = (name: string, text: string): string => {
  const fmt = spawnSync("bunx", ["biome", "format", `--stdin-file-path=${FM_VIEWS_DIR}/${name}`], {
    cwd: repoRoot,
    input: text,
    encoding: "utf8",
  });
  if (fmt.status !== 0) {
    console.error(`check-functionality-map: Biome could not format ${name}.\n${fmt.stderr}`);
    process.exit(1);
  }
  return fmt.stdout;
};

const pageModels = pages.map((p) => p.page);
const stale = staleFunctionalityViews(
  pageModels,
  index,
  (name) => repo.read(`${FM_VIEWS_DIR}/${name}`),
  biomeFormat,
);

for (const name of stale) {
  problems.push({
    rule: FM_RULES.staleViews,
    subject: name,
    severity: "error",
    message: `${FM_VIEWS_DIR}/${name} is stale or missing. Run: bun run functionality-map, and commit the views with the map`,
  });
}

const warnings = problems.filter((p) => p.severity === "warn");
const errors = problems.filter((p) => p.severity === "error");

for (const w of warnings) {
  console.warn(`WARN [${w.rule}] ${w.message}`);
}
for (const e of errors) {
  console.error(`FAIL [${e.rule}] ${e.message}`);
}

if (errors.length > 0) {
  process.exit(1);
}

console.log(
  `Functionality map ok: ${pageModels.length} page(s), ${index.excluded_routes.length} excluded route(s), ${discoveredRoutes.length} discovered route(s).`,
);
