/**
 * E41. The mutation score ratchet, for the local monthly check (owner decision, 20 November 2026:
 * mutation testing is a local check, not a CI job). `bun run mutation` calls it (as `bun run mutation:score`) after each
 * Stryker run (scripts/run-mutation.ts).
 *
 * Usage:
 *   bun scripts/check-mutation-score.ts check <packageDir> [report.json]
 *     Compares the package's report with its floor in scripts/mutation-baseline.json.
 *     Default report: <packageDir>/reports/mutation/mutation.json.
 *     Exit 1 when the score is under the floor, when the package has no floor, or when the report
 *     has no faults that count.
 *   bun scripts/check-mutation-score.ts survivors <packageDir> [report.json]
 *     Lists the faults no test caught, for triage. Always exit 0.
 *
 * Markdown goes to stdout; failures go to stderr. Not part of check:laws: it needs a Stryker
 * report, which only a local Stryker run produces.
 */
import { join } from "node:path";
import {
  checkScore,
  formatSummary,
  formatSurvivors,
  readBaseline,
  readReport,
  scoreReport,
} from "./lib/mutation-score";

const root = join(import.meta.dir, "..");
const [command, packageDir, reportArg, ...extra] = process.argv.slice(2);

function usage(): never {
  console.error(
    "Usage: bun scripts/check-mutation-score.ts <check|survivors> <packageDir> [report.json]",
  );
  process.exit(2);
}

if (!packageDir || extra.length > 0 || !["check", "survivors"].includes(command ?? "")) usage();
const reportPath = reportArg ?? join(root, packageDir, "reports/mutation/mutation.json");
const report = readReport(reportPath);

if (command === "survivors") {
  console.log(formatSurvivors(packageDir, report));
} else {
  const result = scoreReport(report);
  const baseline = readBaseline(join(root, "scripts/mutation-baseline.json"));
  const check = checkScore(result, baseline.packages[packageDir]);
  console.log(formatSummary(packageDir, result, check));
  if (check.status !== "ok") {
    console.error(
      check.status === "below"
        ? `Mutation score check FAILED: ${packageDir} scored ${check.score.toFixed(2)}%, under its floor of ${check.floor}%.`
        : check.status === "no-floor"
          ? `Mutation score check FAILED: ${packageDir} has no floor in scripts/mutation-baseline.json.`
          : `Mutation score check FAILED: the report has no faults that count (${reportPath}).`,
    );
    process.exit(1);
  }
}
