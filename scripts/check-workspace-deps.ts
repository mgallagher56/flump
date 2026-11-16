/**
 * Workspace dependency law (E36 H2): runs `knip --include dependencies` over `apps/web` and
 * `packages/*` (extending the backend knip law in `scripts/backend-laws/check-dead-code.ts`).
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "..");

const webRun = spawnSync("bunx", ["knip", "--include", "dependencies", "--no-progress"], {
  cwd: resolve(repoRoot, "apps/web"),
  stdio: "inherit",
});
if (webRun.status !== 0) {
  console.error("check-workspace-deps: knip found unused dependencies in apps/web (see above)");
  process.exit(1);
}

const pkgRun = spawnSync(
  "bunx",
  ["knip", "--include", "dependencies", "--workspace", "packages/*", "--no-progress"],
  {
    cwd: repoRoot,
    stdio: "inherit",
  },
);
if (pkgRun.status !== 0) {
  console.error("check-workspace-deps: knip found unused dependencies in packages/* (see above)");
  process.exit(1);
}

console.log(
  "check-workspace-deps: OK (knip finds no unused dependencies in apps/web or packages/*)",
);
