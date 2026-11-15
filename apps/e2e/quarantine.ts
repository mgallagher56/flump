/**
 * The E2E quarantine list (backend audit 2026-11, finding L10).
 *
 * The smoke suite runs with `retries: 0`, so a spec that fails once fails the job: a pass on retry
 * would hide a flaky spec. When a spec is known to be flaky and cannot be fixed straight away, it
 * goes here with a reason instead of bringing retries back. A quarantined test is left out of the
 * gating run and is named in the CI job summary on every run, so it stays visible until fixed.
 *
 * Rules (scripts/ci-config.test.ts enforces them):
 * - every entry names the spec file, the test title, a reason and the date it was added;
 * - the list holds at most MAX_QUARANTINED entries: it is a short-term holding place, not a skip list.
 *
 * To run only the quarantined tests (for example to see whether one is still flaky):
 *   E2E_QUARANTINE=only bun run test:e2e
 *
 * This file imports nothing, so the repo script tests can read it without Playwright.
 */
export interface QuarantinedTest {
  /** Spec file name under `tests/`, for example `mortgage.spec.ts`. */
  file: string;
  /** The test title exactly as written in `test("...")`. */
  title: string;
  /** What fails, and how often, in a sentence. */
  reason: string;
  /** ISO date the entry was added. */
  since: string;
  /** Issue or PR that tracks the fix, when there is one. */
  tracking?: string;
}

export const MAX_QUARANTINED = 5;

export const QUARANTINE: readonly QuarantinedTest[] = [];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A pattern for Playwright's `grep` / `grepInvert`, which test it against
 * "<project> <file> <describe titles> <test title>". Undefined when nothing is quarantined, so
 * the config passes no filter at all.
 */
export function quarantinePattern(
  list: readonly QuarantinedTest[] = QUARANTINE,
): RegExp | undefined {
  if (list.length === 0) return undefined;
  const alternatives = list.map(
    // Playwright appends a test's tags after its title, so trailing " @tag" words are allowed.
    (entry) => `${escapeRegExp(entry.file)}\\s(?:.*\\s)?${escapeRegExp(entry.title)}(?:\\s@\\S+)*$`,
  );
  return new RegExp(`(?:${alternatives.join("|")})`);
}

/** Problems with the list itself; empty when it is well formed. */
export function quarantineProblems(list: readonly QuarantinedTest[] = QUARANTINE): string[] {
  const problems: string[] = [];
  if (list.length > MAX_QUARANTINED)
    problems.push(`${list.length} entries; the most allowed is ${MAX_QUARANTINED}`);
  const seen = new Set<string>();
  for (const entry of list) {
    const key = `${entry.file} > ${entry.title}`;
    if (seen.has(key)) problems.push(`${key}: listed twice`);
    seen.add(key);
    if (!/^[\w.-]+\.spec\.ts$/.test(entry.file)) problems.push(`${key}: file is not a spec name`);
    if (entry.title.trim() === "") problems.push(`${key}: no test title`);
    if (entry.reason.trim().length < 20)
      problems.push(`${key}: the reason is missing or too short`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.since)) problems.push(`${key}: since is not an ISO date`);
  }
  return problems;
}

/** Markdown for the CI job summary. */
export function quarantineSummary(list: readonly QuarantinedTest[] = QUARANTINE): string {
  if (list.length === 0) return "### 🎭 E2E quarantine\n\nNo quarantined tests. Retries are off.\n";
  const rows = list.map(
    (e) => `| \`${e.file}\` | ${e.title} | ${e.reason} | ${e.since} | ${e.tracking ?? ""} |`,
  );
  return [
    "### 🎭 E2E quarantine",
    "",
    `${list.length} test(s) are left out of the gating run. Retries are off.`,
    "",
    "| Spec | Test | Reason | Since | Tracking |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

if (import.meta.main) {
  process.stdout.write(quarantineSummary());
  // One annotation per entry, so a quarantined test shows on the run page as well.
  for (const entry of QUARANTINE)
    console.error(`::warning title=E2E quarantine::${entry.file}: ${entry.title}`);
}
