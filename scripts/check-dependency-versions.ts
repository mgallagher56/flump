/**
 * Fails when a dependency declared in two or more workspace package.json files has different version strings.
 * Compares dependencies, devDependencies and optionalDependencies (not peerDependencies) in the root, apps/* and packages/*.
 * Deliberate exceptions go in ALLOWED_MISMATCHES in scripts/lib/dependency-versions.ts.
 * Usage: bun scripts/check-dependency-versions.ts
 * Exit: 0 ok, 1 mismatches found.
 */
import { join } from "node:path";
import { findMismatches, formatMismatches, readWorkspaces } from "./lib/dependency-versions";

const root = join(import.meta.dir, "..");
const mismatches = findMismatches(readWorkspaces(root));
if (mismatches.length > 0) {
  console.error(
    `Dependency version check FAILED: ${mismatches.length} package(s) differ between workspaces. Align them (see AGENTS.md, "Dependency versions").\n${formatMismatches(mismatches)}`,
  );
  process.exit(1);
}
console.log("Dependency version check: all shared dependencies match across workspaces.");
