import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { EMPTY_BASELINE, type FlowResult, type InteractionBaseline } from "./report";

/** The committed baseline and its Markdown summary (E38 S0). */
export const BASELINE_DIR = path.resolve(
  import.meta.dirname,
  "../../../docs/audit/interaction-cost",
);
export const BASELINE_PATH = path.join(BASELINE_DIR, "baseline.json");
export const BASELINE_SUMMARY_PATH = path.join(BASELINE_DIR, "baseline.md");

/** This run's output: one fragment per flow run, the merged baseline and the summary. Git-ignored. */
export const RESULTS_DIR = path.resolve(import.meta.dirname, "../test-results-interaction-cost");
const FRAGMENTS_DIR = path.join(RESULTS_DIR, "fragments");
export const GENERATED_BASELINE_PATH = path.join(RESULTS_DIR, "baseline.json");
export const GENERATED_BASELINE_SUMMARY_PATH = path.join(RESULTS_DIR, "baseline.md");
/** The comparison with the committed baseline, also written to the job summary. */
export const GENERATED_SUMMARY_PATH = path.join(RESULTS_DIR, "summary.md");

/** `INTERACTION_UPDATE_BASELINE=1` rewrites the committed baseline from this run. */
export const UPDATE_BASELINE = process.env.INTERACTION_UPDATE_BASELINE === "1";

export const UPDATE_HINT =
  "To accept this run's costs: INTERACTION_UPDATE_BASELINE=1 bun run test:interaction, then " +
  "commit docs/audit/interaction-cost/ (or download the interaction-cost-baseline artifact).";

export function readBaseline(): InteractionBaseline {
  if (!existsSync(BASELINE_PATH)) return EMPTY_BASELINE;
  const parsed = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Partial<InteractionBaseline>;
  return {
    generated: parsed.generated === true,
    frozenNow: parsed.frozenNow ?? "",
    flows: parsed.flows ?? {},
  };
}

export function clearFragments(): void {
  rmSync(RESULTS_DIR, { recursive: true, force: true });
  mkdirSync(FRAGMENTS_DIR, { recursive: true });
}

export function writeFragment(result: FlowResult): void {
  mkdirSync(FRAGMENTS_DIR, { recursive: true });
  writeFileSync(
    path.join(FRAGMENTS_DIR, `${result.flow}__${result.mode}.json`),
    JSON.stringify(result),
  );
}

export function readFragments(): FlowResult[] {
  if (!existsSync(FRAGMENTS_DIR)) return [];
  return readdirSync(FRAGMENTS_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(path.join(FRAGMENTS_DIR, name), "utf8")) as FlowResult);
}

/** Adds to the GitHub Actions job summary when there is one. */
export function appendJobSummary(markdown: string): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) appendFileSync(file, `${markdown}\n`);
}
