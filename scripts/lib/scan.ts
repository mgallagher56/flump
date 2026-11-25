import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const repoRoot = resolve(import.meta.dir, "../..");
export const SCAN_DIRS = ["packages/ui/src", "apps/web/app", "apps/marketing/src"];
/** The Expo app (E12). Scanned by the raw colour, copy, one tax engine and value map checks; the
 * Panda-specific checks (tabular numbers, style literals, icons, inputs) reach it in E12 S1b. */
export const MOBILE_SCAN_DIRS = ["apps/mobile/app", "apps/mobile/src"];
// Files that legitimately define primitives/hex. The token source moved to packages/tokens
// (outside SCAN_DIRS); packages/ui/src/tokens now only re-exports it.
const TOKEN_DEFINITION_FILES = ["packages/tokens/src/index.ts", "packages/tokens/src/elevation.ts"];
const SKIP_DIRS = new Set(["node_modules", "styled-system", "dist", "build", ".storybook"]);
const SKIP_FILE = /\.(?:test|spec|stories)\.tsx?$|\.d\.ts$/;

export function shouldSkip(relPath: string): boolean {
  return (
    !/\.tsx?$/.test(relPath) || SKIP_FILE.test(relPath) || TOKEN_DEFINITION_FILES.includes(relPath)
  );
}

export function collectFiles(root = repoRoot, dirs = SCAN_DIRS): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(full);
      } else {
        const rel = relative(root, full).split("\\").join("/");
        if (!shouldSkip(rel)) out.push(rel);
      }
    }
  };
  for (const d of dirs) {
    try {
      walk(join(root, d));
    } catch {}
  }
  return out.sort();
}

export function readSource(root: string, rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}
