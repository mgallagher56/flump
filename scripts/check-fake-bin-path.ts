/**
 * Fails when a test puts fake tools in front of real directories on PATH
 * (scripts/lib/fake-bin-path.ts). Use isolatedPath from scripts/lib/fake-bin.ts instead.
 *   bun scripts/check-fake-bin-path.ts
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findFakeThenRealPaths, isTestFile } from "./lib/fake-bin-path";
import { repoRoot } from "./lib/scan";

const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { cwd: repoRoot, encoding: "utf8" },
)
  .split("\0")
  .filter((f) => isTestFile(f) && existsSync(join(repoRoot, f)));

const hits = files.flatMap((file) =>
  findFakeThenRealPaths(readFileSync(join(repoRoot, file), "utf8")).map((l) => `${file}:${l}`),
);
if (hits.length) {
  console.error(
    `A test puts fake tools in front of real directories on PATH:\n${hits.join("\n")}\nA real tool there answers whenever the fake is missing (e59a4b811). Build the PATH with isolatedPath from scripts/lib/fake-bin.ts: the fakes plus symlinks to the named real tools, nothing else.`,
  );
  process.exit(1);
}
console.log("check-fake-bin-path: OK");
