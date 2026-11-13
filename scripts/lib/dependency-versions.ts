import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Sections compared across workspaces. peerDependencies are deliberately left out (they are ranges, not pins). */
export const COMPARED_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

export type WorkspaceManifest = {
  /** Workspace directory relative to the repo root ("." for the root). */
  dir: string;
  manifest: Partial<Record<(typeof COMPARED_SECTIONS)[number], Record<string, string>>>;
};

export type Mismatch = {
  name: string;
  versions: { dir: string; version: string }[];
};

/** Packages that are deliberately allowed to differ between workspaces. Keep empty unless there is a reason. */
export const ALLOWED_MISMATCHES: Record<string, string> = {};

export function findMismatches(
  workspaces: WorkspaceManifest[],
  allow: Record<string, string> = ALLOWED_MISMATCHES,
): Mismatch[] {
  const byName = new Map<string, { dir: string; version: string }[]>();
  for (const { dir, manifest } of workspaces) {
    for (const section of COMPARED_SECTIONS) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        const entries = byName.get(name) ?? [];
        entries.push({ dir, version });
        byName.set(name, entries);
      }
    }
  }
  const out: Mismatch[] = [];
  for (const [name, entries] of [...byName].sort(([a], [b]) => a.localeCompare(b))) {
    if (name in allow) continue;
    // Compare every declaration, so one workspace listing a package in two sections with different versions is caught too.
    if (new Set(entries.map((e) => e.dir)).size < 2 && entries.length < 2) continue;
    if (new Set(entries.map((e) => e.version)).size < 2) continue;
    const unique = new Map(entries.map((e) => [`${e.dir}\0${e.version}`, e]));
    out.push({
      name,
      versions: [...unique.values()].sort(
        (x, y) => x.dir.localeCompare(y.dir) || x.version.localeCompare(y.version),
      ),
    });
  }
  return out;
}

export function readWorkspaces(root: string): WorkspaceManifest[] {
  const dirs = ["."];
  for (const group of ["apps", "packages"]) {
    const base = join(root, group);
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (e.isDirectory()) dirs.push(`${group}/${e.name}`);
    }
  }
  return dirs
    .filter((dir) => existsSync(join(root, dir, "package.json")))
    .map((dir) => ({
      dir,
      manifest: JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8")),
    }));
}

export function formatMismatches(mismatches: Mismatch[]): string {
  return mismatches
    .map((m) => `  ${m.name}\n${m.versions.map((v) => `    ${v.dir}: ${v.version}`).join("\n")}`)
    .join("\n");
}
