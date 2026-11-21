/**
 * Builds the generated Markdown views of the user-POV functionality map from
 * docs/system/functionality-map/index.yaml and pages/{web|marketing}/*.yaml.
 *
 * Usage: bun scripts/generate-functionality-map.ts          write the generated views
 *        bun scripts/generate-functionality-map.ts --check  run scripts/check-functionality-map.ts
 * Exit: 0 ok, 1 a malformed map (or a failed check).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  FM_RULES,
  renderFunctionalityViews,
  validateFunctionalityMap,
} from "./lib/functionality-map";
import { createRepoView, FM_VIEWS_DIR, loadFunctionalityMap } from "./lib/functionality-map-fs";

const root = resolve(import.meta.dir, "..");
const outDir = join(root, FM_VIEWS_DIR);

if (process.argv.includes("--check")) {
  const run = spawnSync("bun", [join(import.meta.dir, "check-functionality-map.ts")], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(run.status ?? 1);
}

const repo = createRepoView(root);
const { index, pages, valueMap } = loadFunctionalityMap(root);

const malformed = validateFunctionalityMap({
  index,
  pages,
  repo,
  valueMap,
  discoveredRoutes: [],
}).filter((p) => p.rule === FM_RULES.malformed || p.rule === FM_RULES.duplicateId);

if (malformed.length > 0) {
  console.error(
    `Functionality map: ${malformed.length} problem(s) to fix before the views can be written.\n${malformed.map((p) => p.message).join("\n")}`,
  );
  process.exit(1);
}

const pageModels = pages.map((p) => p.page);
const views = renderFunctionalityViews(pageModels, index);
mkdirSync(outDir, { recursive: true });
for (const [name, text] of Object.entries(views)) {
  writeFileSync(join(outDir, name), text);
}

const format = spawnSync("bunx", ["biome", "format", "--write", outDir], { cwd: root });
if (format.status !== 0) {
  console.error(
    `Functionality map: Biome could not format the views.\n${format.stderr?.toString() ?? ""}`,
  );
  process.exit(1);
}

console.log(
  `Functionality map: wrote ${Object.keys(views).length} views for ${pageModels.length} page(s).`,
);
