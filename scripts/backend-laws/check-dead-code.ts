/**
 * Backend dead-code law (BE-14, audit L17). Runs knip over `apps/backend` (config: `knip.json`)
 * and fails on any unused file, dependency, export or exported type. Fix by deleting the dead
 * code or dropping the `export`; add an entry to `knip.json` only for a real entry point.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../..");
const run = spawnSync("bunx", ["knip", "--workspace", "apps/backend", "--no-progress"], {
  cwd: repoRoot,
  stdio: "inherit",
});
if (run.status !== 0) {
  console.error("check-dead-code: knip found dead code in apps/backend (see above)");
  process.exit(1);
}
console.log("check-dead-code: OK (knip finds no dead code in apps/backend)");
