// The orb-only colour check (STYLE-GUIDE 2.7 rule MC1, UX-GUIDELINES MK5). Fails when a violet
// or rose token is used outside the allow-list in scripts/lib/orbColours.ts, in apps/marketing,
// apps/web, apps/mobile or packages/ui. No baseline: every allowed file is named with its reason.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { findOrbColourUses, isOrbColourAllowed, ORB_COLOUR_ALLOW_LIST } from "./lib/orbColours";
import { readSource, repoRoot, trackedFiles, UI_SCAN_DIRS } from "./lib/scan";

const SKIP_DIRS = new Set(["node_modules", "styled-system", "dist", "build", ".storybook"]);
const SKIP_FILE = /\.(?:test|spec|stories)\.tsx?$|\.d\.ts$/;

/** Source and style files under the UI scan dirs (tests and stories are not shipped). */
export function orbScanFiles(root = repoRoot): string[] {
  return trackedFiles(root, UI_SCAN_DIRS).filter(
    (rel) =>
      /\.(?:tsx?|css)$/.test(rel) &&
      !SKIP_FILE.test(rel) &&
      !rel.split("/").some((part) => SKIP_DIRS.has(part)),
  );
}

export function runOrbColourCheck(root = repoRoot): string[] {
  const errors: string[] = [];
  for (const { path } of ORB_COLOUR_ALLOW_LIST) {
    if (!existsSync(join(root, path))) errors.push(`STALE allow-list entry, no such path: ${path}`);
  }
  for (const file of orbScanFiles(root)) {
    if (isOrbColourAllowed(file)) continue;
    const uses = findOrbColourUses(readSource(root, file));
    if (uses.length) errors.push(`${file}: ${[...new Set(uses)].join(", ")}`);
  }
  return errors;
}

if (import.meta.main) {
  const errors = runOrbColourCheck();
  for (const e of errors) {
    console.error(
      e.startsWith("STALE")
        ? `FAIL ${e} (remove it from scripts/lib/orbColours.ts)`
        : `FAIL ${e}: violet and rose are for the orb, its beads and the bubble fields only (STYLE-GUIDE 2.7 MC1). Use mint, a neutral or an orb.skyTeal token, or, with sign-off, add the file to scripts/lib/orbColours.ts with a reason`,
    );
  }
  if (errors.length) process.exit(1);
  console.log("check-orb-colours: OK");
}
