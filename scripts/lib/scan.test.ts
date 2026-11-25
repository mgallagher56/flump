import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectTrackedFiles, trackedFiles } from "./scan";

// The London date and em dash ratchets list files with these, so a file that is only on one
// machine (untracked or ignored) must never reach their counts.
let dir = "";
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = "";
});

function repoWith(files: Record<string, string>, track: string[]): string {
  dir = mkdtempSync(join(tmpdir(), "scan-tracked-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
  execFileSync("git", ["add", "--", ...track], { cwd: dir });
  return dir;
}

describe("trackedFiles", () => {
  test("an untracked file is ignored; a tracked one is listed", () => {
    const root = repoWith({ "docs/tracked.md": "a", "docs/untracked.md": "c" }, [
      "docs/tracked.md",
    ]);
    expect(trackedFiles(root)).toEqual(["docs/tracked.md"]);
  });

  test("an ignored file is ignored too", () => {
    const root = repoWith({ ".gitignore": "local.md\n", "local.md": "x", "kept.md": "y" }, [
      ".gitignore",
      "kept.md",
    ]);
    expect(trackedFiles(root)).toEqual([".gitignore", "kept.md"]);
  });

  test("a tracked file deleted in the working tree is left out", () => {
    const root = repoWith({ "a.md": "x", "b.md": "y" }, ["a.md", "b.md"]);
    rmSync(join(root, "b.md"));
    expect(trackedFiles(root)).toEqual(["a.md"]);
  });

  test("dirs limit the listing", () => {
    const root = repoWith({ "in/a.ts": "", "out/b.ts": "" }, ["in/a.ts", "out/b.ts"]);
    expect(trackedFiles(root, ["in"])).toEqual(["in/a.ts"]);
  });
});

describe("collectTrackedFiles", () => {
  test("keeps collectFiles' skips and drops untracked source", () => {
    const root = repoWith(
      {
        "app/a.ts": "",
        "app/a.test.ts": "",
        "app/b.d.ts": "",
        "app/readme.md": "",
        "app/build/c.ts": "",
        "app/untracked.ts": "new Date().getMonth();",
      },
      ["app/a.ts", "app/a.test.ts", "app/b.d.ts", "app/readme.md", "app/build/c.ts"],
    );
    expect(collectTrackedFiles(root, ["app"])).toEqual(["app/a.ts"]);
  });
});
