/**
 * Fails a production build that still contains placeholder text (E24-T1).
 * Usage: bun scripts/check-launch-placeholders.ts <dir>... [--force]
 * A no-op unless FLUMP_LAUNCH or ALLOW_INDEXING is exactly "true" (a public launch) or --force is passed.
 * Also fails while any field in packages/business-details is still marked isPlaceholder.
 * Exit: 0 ok or skipped, 1 placeholders found, 2 no directory given, 3 a directory is missing or has no scannable files.
 */
import { existsSync, statSync } from "node:fs";
import {
  collectBuildFiles,
  isLaunchGuardActive,
  placeholderConfigFields,
  scanDirectories,
} from "./lib/launch-placeholders";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dirs = args.filter((a) => !a.startsWith("--"));

if (!isLaunchGuardActive(process.env) && !force) {
  console.log(
    "Launch placeholder guard: skipped (neither FLUMP_LAUNCH nor ALLOW_INDEXING is true).",
  );
  process.exit(0);
}
if (dirs.length === 0) {
  console.error("Launch placeholder guard: no directory given.");
  process.exit(2);
}
const missing = dirs.filter((d) => !existsSync(d) || !statSync(d).isDirectory());
if (missing.length > 0) {
  console.error(`Launch placeholder guard: missing build directory: ${missing.join(", ")}`);
  process.exit(3);
}
const empty = dirs.filter((d) => collectBuildFiles(d).length === 0);
if (empty.length > 0) {
  console.error(`Launch placeholder guard: no scannable files in: ${empty.join(", ")}`);
  process.exit(3);
}

const hits = scanDirectories(dirs);
const unset = placeholderConfigFields();
if (hits.length > 0 || unset.length > 0) {
  if (hits.length > 0) {
    console.error(`Launch placeholder guard FAILED: ${hits.length} hit(s) in the build output.`);
    for (const h of hits) console.error(`  ${h.file}:${h.line} [${h.pattern}] ...${h.excerpt}...`);
  }
  if (unset.length > 0) {
    console.error(
      `Launch placeholder guard FAILED: ${unset.length} business detail(s) are still placeholders: ${unset
        .map((f) => f.key)
        .join(
          ", ",
        )}. Edit packages/business-details/src/index.ts (docs/runbooks/business-details.md).`,
    );
  }
  process.exit(1);
}
console.log(`Launch placeholder guard: clean (${dirs.join(", ")}).`);
