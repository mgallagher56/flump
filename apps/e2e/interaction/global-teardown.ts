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
 * Merges this run's flow costs into a baseline and compares them with the committed one.
 * Warn-only (owner decision ED1 option (a), until E38 S1 and S2 land): a cost increase is printed
 * and written to the job summary, and never fails the run.
 */
export default async function globalTeardown(): Promise<void> {
  const results = readFragments();
  if (results.length === 0) return;
  const previous = readBaseline();
  // Empty when the servers kept the real clock (a run outside the CI container).
  const clock = SERVER_CLOCK_FROZEN ? FROZEN_NOW : "";
  const next = mergeResults(previous, results, clock);
  writeFileSync(GENERATED_BASELINE_PATH, serializeBaseline(next));
  writeFileSync(GENERATED_BASELINE_SUMMARY_PATH, baselineMarkdown(next));

  const recorded = UPDATE_BASELINE || !previous.generated;
  const comparison = compareResults(previous, results);
  const summary = comparisonSummary(
    comparison,
    mergeResults({ ...previous, flows: {} }, results, clock),
    {
      recorded,
    },
  );
  writeFileSync(GENERATED_SUMMARY_PATH, summary);
  appendJobSummary(summary);

  if (recorded) {
    writeFileSync(BASELINE_PATH, serializeBaseline(next));
    writeFileSync(BASELINE_SUMMARY_PATH, baselineMarkdown(next));
    console.log(`\n[interaction] wrote the baseline to ${BASELINE_PATH}`);
    console.log(baselineTable(next));
    return;
  }
  for (const change of comparison.regressions)
    console.log(`::warning title=Interaction cost::${describeChange(change)}`);
  for (const change of comparison.improvements) console.log(`  IMPROVED ${describeChange(change)}`);
  console.log(
    `\n[interaction] ${comparison.regressions.length} increase(s), ${comparison.improvements.length} improvement(s) against the baseline.`,
  );
  if (comparison.regressions.length + comparison.improvements.length > 0) console.log(UPDATE_HINT);
}
