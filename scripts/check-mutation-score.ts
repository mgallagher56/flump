/**
 * E41 M1. The mutation score ratchet and the helpers the mutation workflow needs.
 *
 * Usage:
 *   bun scripts/check-mutation-score.ts check <packageDir> [report.json ...]
 *     Compares the package's full report with its floor in scripts/mutation-baseline.json. With
 *     several reports, report N is taken as shard N of that many: each is cut to the files of its
 *     shard, then they are joined. Default: <packageDir>/reports/mutation/mutation.json.
 *     Exit 1 when the score is under the floor, when the package has no floor, or when the report
 *     has no faults that count.
 *   bun scripts/check-mutation-score.ts shard <packageDir> <index> <count>
 *     Prints shard <index> (1-based) of <count> of the package's mutate files, comma-separated for
 *     Stryker's --mutate.
 *   git diff --name-only <base>...HEAD | bun scripts/check-mutation-score.ts targets <packageDir>
 *     Prints the changed files to mutate, comma-separated. Empty when none.
 *   bun scripts/check-mutation-score.ts survivors <packageDir> [report.json]
 *     Lists the faults no test caught, for the advisory pull request job. Always exit 0.
 *
 * Markdown goes to stdout (the workflow appends it to the job summary); failures go to stderr.
 * Not part of check:laws: it needs a Stryker report, which only the mutation workflow produces.
 */
import { join } from "node:path";
import {
  checkScore,
  formatSummary,
  formatSurvivors,
  joinShardReports,
  listMutateFiles,
  mergeReports,
  partitionFiles,
  readBaseline,
  readMutateGlobs,
  readReport,
  scoreReport,
  selectMutateTargets,
} from "./lib/mutation-score";

const root = join(import.meta.dir, "..");
const [command, packageDir, ...rest] = process.argv.slice(2);

function usage(): never {
  console.error(
    "Usage: bun scripts/check-mutation-score.ts <check|shard|targets|survivors> <packageDir> [...]",
  );
  process.exit(2);
}

if (!packageDir || !["check", "shard", "targets", "survivors"].includes(command ?? "")) usage();
const reportPaths =
  rest.length > 0 ? rest : [join(root, packageDir, "reports/mutation/mutation.json")];

if (command === "shard") {
  const index = Number(rest[0]);
  const count = Number(rest[1]);
  if (!Number.isInteger(index) || index < 1 || index > count) usage();
  const files = listMutateFiles(root, packageDir, readMutateGlobs(root, packageDir));
  console.log((partitionFiles(files, count)[index - 1] ?? []).join(","));
} else if (command === "targets") {
  const changed = (await Bun.stdin.text()).split("\n").filter(Boolean);
  console.log(
    selectMutateTargets(changed, packageDir, readMutateGlobs(root, packageDir)).join(","),
  );
} else if (command === "survivors") {
  console.log(formatSurvivors(packageDir, mergeReports(reportPaths.map(readReport))));
} else {
  const reports = reportPaths.map(readReport);
  const joined =
    reports.length > 1
      ? joinShardReports(
          reports,
          listMutateFiles(root, packageDir, readMutateGlobs(root, packageDir)),
        )
      : mergeReports(reports);
  const result = scoreReport(joined);
  const baseline = readBaseline(join(root, "scripts/mutation-baseline.json"));
  const check = checkScore(result, baseline.packages[packageDir]);
  console.log(formatSummary(packageDir, result, check));
  if (check.status !== "ok") {
    console.error(
      check.status === "below"
        ? `Mutation score check FAILED: ${packageDir} scored ${check.score.toFixed(2)}%, under its floor of ${check.floor}%.`
        : check.status === "no-floor"
          ? `Mutation score check FAILED: ${packageDir} has no floor in scripts/mutation-baseline.json.`
          : `Mutation score check FAILED: the report has no faults that count (${reportPaths.join(", ")}).`,
    );
    process.exit(1);
  }
}
