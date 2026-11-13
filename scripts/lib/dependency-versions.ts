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
  const byName = new Map<string, Map<string, string>>();
  for (const { dir, manifest } of workspaces) {
    for (const section of COMPARED_SECTIONS) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        const entry = byName.get(name) ?? new Map<string, string>();
        entry.set(dir, version);
        byName.set(name, entry);
      }
    }
  }
  const out: Mismatch[] = [];
  for (const [name, perDir] of [...byName].sort(([a], [b]) => a.localeCompare(b))) {
    if (perDir.size < 2 || name in allow) continue;
    if (new Set(perDir.values()).size < 2) continue;
    out.push({
      name,
      versions: [...perDir]
        .map(([dir, version]) => ({ dir, version }))
        .sort((a, b) => a.dir.localeCompare(b.dir)),
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
