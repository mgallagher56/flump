// The import ban (UX-GUIDELINES AT4, MK12; DECISIONS D1). GSAP and three.js ship on the marketing
// site only: nothing outside apps/marketing imports `gsap` or `three` (or a subpath, or GSAP's and
// three.js's scoped packages), and no other workspace declares them as a dependency. The shared
// hooks in packages/ui hold the logic only. Every tracked source file counts, tests and stories too,
// since a test import would make the package depend on the library. No allow-list, no baseline.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readSource, repoRoot, trackedFiles } from "./lib/scan";

/** The one place the libraries may be used. */
export const MOTION_LIBRARY_HOME = "apps/marketing/";

/** `gsap`, `three`, their subpaths (`gsap/ScrollTrigger`, `three/addons/…`) and `@gsap/*`, `@react-three/*`. */
const LIBRARY = String.raw`(?:gsap|three|@gsap\/[^"'\x60/]+|@react-three\/[^"'\x60/]+)(?:\/[^"'\x60]*)?`;

const IMPORT_PATTERNS = [
  // import x from "…", export { x } from "…", import type { x } from "…"
  new RegExp(String.raw`\bfrom\s*["'\x60](${LIBRARY})["'\x60]`, "g"),
  // import "…" (side effect)
  new RegExp(String.raw`\bimport\s*["'\x60](${LIBRARY})["'\x60]`, "g"),
  // import("…"), require("…"), require.resolve("…"), vi.mock("…"), jest.mock("…")
  new RegExp(
    String.raw`\b(?:import|require(?:\.resolve)?|(?:vi|jest)\.(?:mock|doMock|importActual))\s*\(\s*["'\x60](${LIBRARY})["'\x60]`,
    "g",
  ),
];

/** The library specifiers a source file imports. */
export function findMotionImports(source: string): string[] {
  const found: string[] = [];
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) found.push(match[1] as string);
  }
  return found;
}

const LIBRARY_NAME = new RegExp(String.raw`^${LIBRARY}$`);
const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

/** The library packages a package.json declares, in any dependency field. */
export function findMotionDependencies(packageJson: string): string[] {
  const parsed = JSON.parse(packageJson) as Record<string, unknown>;
  const found: string[] = [];
  for (const field of DEPENDENCY_FIELDS) {
    const deps = parsed[field];
    if (deps && typeof deps === "object") {
      for (const name of Object.keys(deps)) if (LIBRARY_NAME.test(name)) found.push(name);
    }
  }
  return found;
}

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "styled-system", ".expo"]);

export function runMotionImportCheck(root = repoRoot): string[] {
  const errors: string[] = [];
  for (const file of trackedFiles(root)) {
    if (file.startsWith(MOTION_LIBRARY_HOME)) continue;
    if (file.split("/").some((part) => SKIP_DIRS.has(part))) continue;
    if (file === "package.json" || file.endsWith("/package.json")) {
      const deps = findMotionDependencies(readFileSync(join(root, file), "utf8"));
      if (deps.length) errors.push(`${file}: declares ${deps.join(", ")}`);
      continue;
    }
    if (!SOURCE.test(file)) continue;
    const uses = findMotionImports(readSource(root, file));
    if (uses.length) errors.push(`${file}: imports ${[...new Set(uses)].join(", ")}`);
  }
  return errors;
}

if (import.meta.main) {
  const errors = runMotionImportCheck();
  for (const e of errors) {
    console.error(
      `FAIL ${e}: GSAP and three.js are for apps/marketing only (UX-GUIDELINES AT4, DECISIONS D1). Keep the logic in a packages/ui hook and the library calls in apps/marketing/src/components`,
    );
  }
  if (errors.length) process.exit(1);
  console.log("check-motion-imports: OK");
}
