import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  ALLOWED_MISMATCHES,
  findMismatches,
  formatMismatches,
  readWorkspaces,
  type WorkspaceManifest,
} from "./lib/dependency-versions";

const ws = (dir: string, manifest: WorkspaceManifest["manifest"]): WorkspaceManifest => ({
  dir,
  manifest,
});

describe("findMismatches", () => {
  test("passes when shared versions match across sections", () => {
    const r = findMismatches([
      ws(".", { devDependencies: { typescript: "7.0.2" } }),
      ws("apps/web", {
        dependencies: { react: "1.0.0" },
        devDependencies: { typescript: "7.0.2" },
      }),
      ws("packages/ui", { optionalDependencies: { react: "1.0.0" } }),
    ]);
    expect(r).toEqual([]);
  });

  test("reports each workspace's version when they differ", () => {
    const r = findMismatches([
      ws("apps/web", { dependencies: { zod: "4.0.0" } }),
      ws("packages/ui", { devDependencies: { zod: "4.1.0" } }),
    ]);
    expect(r).toEqual([
      {
        name: "zod",
        versions: [
          { dir: "apps/web", version: "4.0.0" },
          { dir: "packages/ui", version: "4.1.0" },
        ],
      },
    ]);
    expect(formatMismatches(r)).toContain("packages/ui: 4.1.0");
  });

  test("ignores single-use dependencies and peerDependencies", () => {
    const r = findMismatches([
      ws("apps/web", { dependencies: { solo: "1.0.0", react: "19.0.0" } }),
      ws("packages/ui", { dependencies: {} }),
      {
        dir: "packages/x",
        manifest: { peerDependencies: { react: "^19" } },
      } as unknown as WorkspaceManifest,
    ]);
    expect(r).toEqual([]);
  });

  test("honours the allow-list", () => {
    const set = [
      ws("a", { dependencies: { foo: "1.0.0" } }),
      ws("b", { dependencies: { foo: "2.0.0" } }),
    ];
    expect(findMismatches(set, { foo: "deliberate" })).toEqual([]);
    expect(findMismatches(set)).toHaveLength(1);
  });
});

describe("repository manifests", () => {
  test("shared dependencies match across all workspaces", () => {
    const root = join(import.meta.dir, "..");
    const mismatches = findMismatches(readWorkspaces(root));
    expect(formatMismatches(mismatches)).toBe("");
  });

  test("the allow-list starts empty", () => {
    expect(ALLOWED_MISMATCHES).toEqual({});
  });
});
