import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type A11yBaseline,
  type CheckFindings,
  EMPTY_BASELINE,
  type FindingsFragment,
} from "./baseline";

/** The committed known-failures baseline. */
export const BASELINE_PATH = path.resolve(import.meta.dirname, "baseline.json");

/** This run's output: one fragment per test, and the merged baseline it produced. Git-ignored. */
export const RESULTS_DIR = path.resolve(import.meta.dirname, "../test-results-a11y-findings");
const FRAGMENTS_DIR = path.join(RESULTS_DIR, "fragments");
/** Always written at the end of a run, so CI can upload it whatever the mode. */
export const GENERATED_BASELINE_PATH = path.join(RESULTS_DIR, "baseline.json");

/** `A11Y_UPDATE_BASELINE=1` rewrites the committed baseline from this run instead of failing. */
export const UPDATE_BASELINE = process.env.A11Y_UPDATE_BASELINE === "1";

export const UPDATE_HINT =
  "If the change is intended, regenerate the baseline: A11Y_UPDATE_BASELINE=1 bun run test:a11y " +
  "(or run the a11y-gate workflow with update=true) and commit apps/e2e/a11y/baseline.json.";

export function readBaseline(): A11yBaseline {
  if (!existsSync(BASELINE_PATH)) return EMPTY_BASELINE;
  const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Partial<A11yBaseline>;
  return { generated: parsed.generated === true, routes: parsed.routes ?? {} };
}

/** True when this run records rather than enforces: update mode, or no baseline yet. */
export function recordOnly(baseline: A11yBaseline = readBaseline()): boolean {
  return UPDATE_BASELINE || !baseline.generated;
}

export function clearFragments(): void {
  rmSync(RESULTS_DIR, { recursive: true, force: true });
  mkdirSync(FRAGMENTS_DIR, { recursive: true });
}

export function writeFragment(route: string, project: string, findings: CheckFindings): void {
  mkdirSync(FRAGMENTS_DIR, { recursive: true });
  const fragment: FindingsFragment = { route, project, findings };
  writeFileSync(path.join(FRAGMENTS_DIR, `${route}__${project}.json`), JSON.stringify(fragment));
}

export function readFragments(): FindingsFragment[] {
  if (!existsSync(FRAGMENTS_DIR)) return [];
  return readdirSync(FRAGMENTS_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(path.join(FRAGMENTS_DIR, name), "utf8")));
}
