import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "..");

function readJson(file: string) {
  return JSON.parse(readFileSync(resolve(repoRoot, file), "utf8"));
}

describe("lint configuration", () => {
  test("root lint script never writes", () => {
    const { scripts } = readJson("package.json");
    expect(scripts.lint).not.toMatch(/--write|--apply/);
    expect(scripts.lint).toBe("biome ci .");
  });

  test("a local fixing script is available", () => {
    const { scripts } = readJson("package.json");
    expect(scripts["lint:fix"]).toBe("biome check --write .");
  });

  test("biome excludes release-please changelogs", () => {
    const biome = readJson("biome.json");
    expect(biome.files.includes).toContain("!**/CHANGELOG.md");
  });
});

describe("coverage configuration", () => {
  const workspaces = [
    "apps/backend",
    "apps/marketing",
    "packages/banking",
    "packages/finance-engine",
    "packages/mcp",
    "packages/ui",
  ];

  for (const ws of workspaces) {
    test(`${ws} declares an explicit v8 coverage include list`, () => {
      const file = ["vitest.config.ts", "vitest.config.mts"]
        .map((name) => resolve(repoRoot, ws, name))
        .find((path) => existsSync(path));
      expect(file).toBeDefined();
      const source = readFileSync(file as string, "utf8");
      expect(source).toMatch(/provider:\s*"v8"/);
      expect(source).toMatch(/coverage:\s*\{[\s\S]*include:/);
      expect(source).toMatch(/json-summary/);
    });
  }

  test("coverage output is gitignored", () => {
    const ignore = readFileSync(resolve(repoRoot, ".gitignore"), "utf8");
    expect(ignore.split("\n")).toContain("coverage/");
  });

  test("no coverage output is tracked by git", () => {
    const tracked = execFileSync("git", ["ls-files"], {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .split("\n")
      .filter((path) => /(^|\/)coverage\//.test(path));
    expect(tracked).toEqual([]);
  });
});
