/**
 * E41. The local mutation check (owner decision, 20 November 2026): run about once a month, or
 * before a release, by whoever chooses to. Not a CI job.
 *
 * Usage:
 *   bun run mutation <packageDir>   for example packages/mcp or apps/backend
 *   bun run mutation all            every package with a stryker.config.json, one after another
 *
 * For each package: build its workspace dependencies from unmutated source (packages read each
 * other's built dist), run Stryker on the whole package with --force, then check the score against
 * the floor in scripts/mutation-baseline.json. Exit 1 if any package fails its floor or its run.
 *
 * Stryker writes faults into the real source files while it runs (inPlace), so do not edit or
 * commit files in a package while its run is going.
 */
import { join } from "node:path";
import { configuredPackages } from "./lib/mutation-score";

const root = join(import.meta.dir, "..");
const target = process.argv[2];
const packages = configuredPackages(root);

if (!target || (target !== "all" && !packages.includes(target))) {
  console.error(`Usage: bun run mutation <all|${packages.join("|")}>`);
  process.exit(2);
}

/** Runs a command with the terminal attached; true when it exits 0. */
function run(cmd: string[], cwd: string): boolean {
  return Bun.spawnSync(cmd, { cwd, stdio: ["inherit", "inherit", "inherit"] }).exitCode === 0;
}

const results: { pkg: string; passed: boolean; minutes: number }[] = [];
for (const pkg of target === "all" ? packages : [target]) {
  const started = Date.now();
  console.log(`\n=== ${pkg} ===`);
  const passed =
    run(["bunx", "turbo", "run", "build", `--filter={./${pkg}}^...`], root) &&
    run(
      [
        "node",
        join(root, "node_modules/@stryker-mutator/core/bin/stryker.js"),
        "run",
        "--force",
        "--reporters",
        "clear-text,html,json",
      ],
      join(root, pkg),
    ) &&
    run(["bun", "run", "mutation:score", "check", pkg], root);
  results.push({ pkg, passed, minutes: (Date.now() - started) / 60_000 });
}

console.log("\n| Package | Result | Minutes |\n| --- | --- | ---: |");
for (const r of results)
  console.log(`| ${r.pkg} | ${r.passed ? "pass" : "FAIL"} | ${r.minutes.toFixed(1)} |`);
if (results.some((r) => !r.passed)) process.exit(1);
