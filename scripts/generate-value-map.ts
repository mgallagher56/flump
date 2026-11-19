/**
 * Builds the human views of the value map from docs/system/value-map.yaml.
 *
 * The YAML file is the only thing edited by hand. It lists every stored fact about a user and
 * every derived figure, with where each lives, who writes it and who reads it. This script writes
 * docs/system/generated/*.md from it. The rules that keep the map true are in
 * scripts/check-value-map.ts (part of check:laws); see docs/system/README.md.
 *
 * Usage: bun scripts/generate-value-map.ts          write the generated views
 *        bun scripts/generate-value-map.ts --check  run scripts/check-value-map.ts
 * Exit: 0 ok, 1 a malformed map (or a failed check).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseValueMap, RULES, renderViews, validateMap } from "./lib/value-map";

const root = join(import.meta.dir, "..");
const outDir = join(root, "docs/system/generated");

if (process.argv.includes("--check")) {
  const run = spawnSync("bun", [join(import.meta.dir, "check-value-map.ts")], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(run.status ?? 1);
}

const map = parseValueMap(readFileSync(join(root, "docs/system/value-map.yaml"), "utf8"));
// Only a malformed map stops the views: the other rules are the check's job, and a dead path
// should not stop anyone seeing the map.
const malformed = validateMap(map, {
  exists: (path) => existsSync(join(root, path)),
  read: () => null,
  tables: new Map(),
}).filter((p) => p.rule === RULES.malformed);
if (malformed.length > 0) {
  console.error(
    `Value map: ${malformed.length} problem(s) to fix before the views can be written.\n${malformed.map((p) => p.message).join("\n")}`,
  );
  process.exit(1);
}

const views = renderViews(map);
mkdirSync(outDir, { recursive: true });
for (const [name, text] of Object.entries(views)) writeFileSync(join(outDir, name), text);
// Biome formats every Markdown file in the repo; the check formats the same way before comparing.
const format = spawnSync("bunx", ["biome", "format", "--write", outDir], { cwd: root });
if (format.status !== 0) {
  console.error(`Value map: Biome could not format the views.\n${format.stderr?.toString() ?? ""}`);
  process.exit(1);
}
console.log(
  `Value map: wrote ${Object.keys(views).length} views for ${map.facts.length} facts, ${map.figures.length} figures, ${map.links.length} links and ${map.browser_storage.length} browser keys.`,
);
