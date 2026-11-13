import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const backendRoot = resolve(__dirname, "../..");

/** tsconfig files are JSONC: drop whole-line comments before JSON.parse. */
function readJsonc<T>(file: string): T {
  const text = readFileSync(resolve(backendRoot, file), "utf8");
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, "")) as T;
}

// Static guard: after `bun run build` in apps/backend, `find dist -path '*testing*'` must be empty.
describe("production build config", () => {
  it("builds with tsconfig.build.json", () => {
    const pkg = readJsonc<{ scripts: Record<string, string> }>("package.json");
    expect(pkg.scripts.build).toContain("-p tsconfig.build.json");
  });

  it("excludes test-support code and specs from the emit", () => {
    const config = readJsonc<{ extends: string; exclude: string[] }>("tsconfig.build.json");
    expect(config.extends).toBe("./tsconfig.json");
    expect(config.exclude).toContain("src/**/testing/**");
    expect(config.exclude).toContain("src/**/*.spec.ts");
  });

  it("keeps type-checking configs broad enough to cover the testing helpers", () => {
    const base = readJsonc<{ exclude?: string[] }>("tsconfig.json");
    expect(base.exclude ?? []).not.toContain("src/**/testing/**");
  });
});
