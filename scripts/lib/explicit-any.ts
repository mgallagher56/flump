/** Biome's JSON reporter output, reduced to the fields the ratchet reads. */
interface BiomeReport {
  diagnostics?: { category?: string; location?: { path?: string } }[];
}

/**
 * What the ratchet lints (BE-14, M21): the backend and the packages it runs, tests included.
 * `apps/web` and `packages/ui` have their own rules.
 */
export const COUNTED_ROOTS = [
  "apps/backend/",
  "packages/api-contract/",
  "packages/banking/",
  "packages/finance-engine/",
  "packages/mcp/",
  "packages/observability/",
] as const;

/** Backend and backend-package source, specs and test helpers included (BE-14 tightened BE-01). */
export function isCountedFile(path: string): boolean {
  return COUNTED_ROOTS.some((root) => path.startsWith(root)) && /\.tsx?$/.test(path);
}

/** Per-file count of `lint/suspicious/noExplicitAny` diagnostics in a Biome JSON report. */
export function countExplicitAny(report: BiomeReport): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of report.diagnostics ?? []) {
    const path = d.location?.path;
    if (d.category !== "lint/suspicious/noExplicitAny" || !path || !isCountedFile(path)) continue;
    counts[path] = (counts[path] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

export interface RatchetResult {
  /** Files with more `any` than the baseline allows: these fail the law. */
  increases: string[];
  /** Files with fewer: the baseline is stale and must be lowered, so these fail too (BE-14). */
  decreases: string[];
}

export function compareAnyCounts(
  counts: Record<string, number>,
  baseline: Record<string, number>,
): RatchetResult {
  const increases: string[] = [];
  const decreases: string[] = [];
  for (const [file, count] of Object.entries(counts)) {
    const allowed = baseline[file] ?? 0;
    if (count > allowed)
      increases.push(`${file}: ${count} explicit any, baseline allows ${allowed}`);
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    const count = counts[file] ?? 0;
    if (count < allowed) decreases.push(`${file}: baseline ${allowed}, now ${count}`);
  }
  return { increases, decreases };
}
