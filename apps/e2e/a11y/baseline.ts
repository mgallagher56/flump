/**
 * Known-failures baseline for the page-level accessibility gate. Pure logic, no Playwright, so
 * `scripts/a11y-gate.test.ts` can unit-test it.
 *
 * Shape: route name -> Playwright project -> check -> rule -> count. For axe the rule is the axe
 * rule id and the count is the number of failing nodes; for the other checks the rule is a fixed
 * identifier (for example `no-visible-indicator`) and the count is how many elements fail it.
 * Nothing volatile (selectors, class hashes, text) is stored, so the file is stable across runs.
 */

export type RuleCounts = Record<string, number>;
export type CheckFindings = Record<string, RuleCounts>;
export type ProjectFindings = Record<string, CheckFindings>;

export interface A11yBaseline {
  /**
   * False until the first full run has written it. While false the suite records findings and
   * writes the baseline instead of failing, so the first CI run produces it.
   */
  generated: boolean;
  routes: Record<string, ProjectFindings>;
}

export interface Comparison {
  /** A rule that is new, or whose count rose above the baseline. These fail the run. */
  regressions: string[];
  /** A rule whose count fell, or that disappeared. These pass with a notice. */
  improvements: string[];
}

export const EMPTY_BASELINE: A11yBaseline = { generated: false, routes: {} };

/** Drops zero counts and empty checks, so "fixed" and "never seen" read the same. */
export function pruneFindings(findings: CheckFindings): CheckFindings {
  const out: CheckFindings = {};
  for (const [check, rules] of Object.entries(findings)) {
    const kept = Object.entries(rules).filter(([, n]) => n > 0);
    if (kept.length) out[check] = Object.fromEntries(kept);
  }
  return out;
}

/** Compares one route and project's findings with what the baseline allows. */
export function compareFindings(
  label: string,
  current: CheckFindings,
  allowed: CheckFindings | undefined,
): Comparison {
  const regressions: string[] = [];
  const improvements: string[] = [];
  const now = pruneFindings(current);
  const was = pruneFindings(allowed ?? {});
  for (const check of Object.keys(now).sort()) {
    for (const rule of Object.keys(now[check] ?? {}).sort()) {
      const count = now[check]?.[rule] ?? 0;
      const limit = was[check]?.[rule] ?? 0;
      if (count > limit)
        regressions.push(`${label} ${check}: ${rule} ${count}, baseline allows ${limit}`);
    }
  }
  for (const check of Object.keys(was).sort()) {
    for (const rule of Object.keys(was[check] ?? {}).sort()) {
      const limit = was[check]?.[rule] ?? 0;
      const count = now[check]?.[rule] ?? 0;
      if (count < limit) improvements.push(`${label} ${check}: ${rule} ${limit} -> ${count}`);
    }
  }
  return { regressions, improvements };
}

/** One test's findings, as written to a fragment file during the run. */
export interface FindingsFragment {
  route: string;
  project: string;
  findings: CheckFindings;
}

/**
 * Builds the next baseline from this run's fragments. Entries for a route and project that ran
 * are replaced; entries that did not run (a filtered run) are kept unless their route is no
 * longer in `knownRoutes`.
 */
export function mergeBaseline(
  previous: A11yBaseline,
  fragments: readonly FindingsFragment[],
  knownRoutes: ReadonlySet<string>,
): A11yBaseline {
  const routes: Record<string, ProjectFindings> = {};
  for (const [route, projects] of Object.entries(previous.routes)) {
    if (knownRoutes.has(route)) routes[route] = { ...projects };
  }
  for (const { route, project, findings } of fragments) {
    const projects = { ...(routes[route] ?? {}) };
    const pruned = pruneFindings(findings);
    if (Object.keys(pruned).length) projects[project] = pruned;
    else delete projects[project];
    if (Object.keys(projects).length) routes[route] = projects;
    else delete routes[route];
  }
  return { generated: true, routes };
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortDeep((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

/** Sorted keys, two-space indent, trailing newline, no timestamps: byte-stable across runs. */
export function serializeBaseline(baseline: A11yBaseline): string {
  return `${JSON.stringify(sortDeep(baseline), null, 2)}\n`;
}

/** Sum of every count per check, for the summary line. */
export function totalsByCheck(baseline: A11yBaseline): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const projects of Object.values(baseline.routes))
    for (const checks of Object.values(projects))
      for (const [check, rules] of Object.entries(checks))
        for (const n of Object.values(rules)) totals[check] = (totals[check] ?? 0) + n;
  return sortDeep(totals) as Record<string, number>;
}
