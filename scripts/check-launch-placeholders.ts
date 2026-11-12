/**
 * Fails a production build that still contains placeholder text (E24-T1).
 * Usage: bun scripts/check-launch-placeholders.ts <dir>... [--force]
 * A no-op unless FLUMP_LAUNCH is exactly "true" or --force is passed.
 * Exit: 0 ok or skipped, 1 placeholders found, 2 no directory given, 3 a directory is missing.
 */
import { existsSync, statSync } from "node:fs";
import { scanDirectories } from "./lib/launch-placeholders";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dirs = args.filter((a) => !a.startsWith("--"));

if (process.env.FLUMP_LAUNCH !== "true" && !force) {
  console.log("Launch placeholder guard: skipped (FLUMP_LAUNCH is not true).");
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

const hits = scanDirectories(dirs);
if (hits.length > 0) {
  console.error(`Launch placeholder guard FAILED: ${hits.length} hit(s) in the build output.`);
  for (const h of hits) console.error(`  ${h.file}:${h.line} [${h.pattern}] ...${h.excerpt}...`);
  process.exit(1);
}
console.log(`Launch placeholder guard: clean (${dirs.join(", ")}).`);
