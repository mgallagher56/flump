import { writeFileSync } from "node:fs";
import { FROZEN_NOW, SERVER_CLOCK_FROZEN } from "../support/clock";
import {
  baselineMarkdown,
  baselineTable,
  compareResults,
  comparisonSummary,
  describeChange,
  mergeResults,
  serializeBaseline,
} from "./report";
import {
  appendJobSummary,
  BASELINE_PATH,
  BASELINE_SUMMARY_PATH,
  GENERATED_BASELINE_PATH,
  GENERATED_BASELINE_SUMMARY_PATH,
  GENERATED_SUMMARY_PATH,
  readBaseline,
  readFragments,
  UPDATE_BASELINE,
  UPDATE_HINT,
} from "./store";

/**
 * Merges this run's flow costs into a baseline and compares them with the committed one. A cost
 * increase is printed and written to the job summary as a warning; one above its budget
 * (`costLimit`: one click more, no extra transition, 10% more keystrokes or Tab hops) fails the
 * run (ED1 option (b), coordinator sign-off 20 November 2026, PR 841). A problem in the
 * comparison itself (an unreadable baseline, a failed write) is printed as a warning only.
 */
export default async function globalTeardown(): Promise<void> {
  let overBudget = 0;
  try {
    overBudget = compareAndRecord();
  } catch (error) {
    console.log(
      `::warning title=Interaction cost::The comparison did not finish: ${String(error)}`,
    );
  }
  if (overBudget > 0) {
    throw new Error(
      `Interaction cost: ${overBudget} metric(s) over budget against docs/audit/interaction-cost/baseline.json. See the job summary.`,
    );
  }
}

/** Returns how many metrics are over budget (0 when recording a baseline). */
function compareAndRecord(): number {
  const results = readFragments();
  if (results.length === 0) return 0;
  const previous = readBaseline();
  // Empty when the servers kept the real clock (a run outside the CI container).
  const clock = SERVER_CLOCK_FROZEN ? FROZEN_NOW : "";
  const next = mergeResults(previous, results, clock);
  writeFileSync(GENERATED_BASELINE_PATH, serializeBaseline(next));
  writeFileSync(GENERATED_BASELINE_SUMMARY_PATH, baselineMarkdown(next));

  const recorded = UPDATE_BASELINE || !previous.generated;
  const comparison = compareResults(previous, results);
  const thisRun = mergeResults({ ...previous, flows: {} }, results, clock);
  const summary = comparisonSummary(comparison, thisRun, { recorded });
  writeFileSync(GENERATED_SUMMARY_PATH, summary);
  appendJobSummary(summary);

  if (recorded) {
    writeFileSync(BASELINE_PATH, serializeBaseline(next));
    writeFileSync(BASELINE_SUMMARY_PATH, baselineMarkdown(next));
    console.log(`\n[interaction] wrote the baseline to ${BASELINE_PATH}`);
    console.log(baselineTable(next));
    return 0;
  }
  for (const change of comparison.overBudget)
    console.log(`::error title=Interaction cost over budget::${describeChange(change)}`);
  for (const change of comparison.regressions)
    if (!comparison.overBudget.includes(change))
      console.log(`::warning title=Interaction cost::${describeChange(change)}`);
  for (const run of comparison.missing)
    console.log(`::warning title=Interaction cost::Not measured (failed or not run): ${run}`);
  for (const change of comparison.improvements) console.log(`  IMPROVED ${describeChange(change)}`);
  console.log(
    `\n[interaction] ${comparison.regressions.length} increase(s), ${comparison.improvements.length} improvement(s) against the baseline.`,
  );
  if (comparison.regressions.length + comparison.improvements.length > 0) console.log(UPDATE_HINT);
  return comparison.overBudget.length;
}
