import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
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
