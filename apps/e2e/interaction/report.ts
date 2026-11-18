/**
 * The interaction-cost baseline (E38 S0): its shape, how a run is compared with it, and the
 * Markdown summary. Pure functions, tested in scripts/interaction-cost.test.ts.
 */

/** What one run of one flow cost. */
export interface FlowCost {
  /** Pointer presses: mouse clicks or touch taps, including `syntheticClicks`. */
  clicks: number;
  /** Key presses, one per key (a chord such as Ctrl+A is two), including Tab. */
  keystrokes: number;
  /** Tab presses (also counted in `keystrokes`). Non-zero only in the keyboard-only run. */
  tabHops: number;
  /** Path changes in the main frame. */
  routeChanges: number;
  dialogOpens: number;
  dialogCloses: number;
  /** `routeChanges` plus `dialogOpens`: each open and close cycle counts once. */
  transitions: number;
  /** Clicks counted but not seen by the browser: picking an option in a native select. */
  syntheticClicks: number;
}

/** The ways a flow is driven. */
export const RUN_MODES = ["desktop-pointer", "phone-touch", "desktop-keyboard"] as const;
export type RunMode = (typeof RUN_MODES)[number];

/** The metrics compared with the baseline, in report order. */
export const COMPARED_METRICS = ["clicks", "keystrokes", "tabHops", "transitions"] as const;
export type ComparedMetric = (typeof COMPARED_METRICS)[number];

export interface FlowResult {
  flow: string;
  title: string;
  mode: RunMode;
  cost: FlowCost;
}

export interface InteractionBaseline {
  /** False until a run has written it: then every run records instead of comparing. */
  generated: boolean;
  /** The clock the run used, so a reader knows which month the check-in covered. */
  frozenNow: string;
  flows: Record<string, { title: string; runs: Partial<Record<RunMode, FlowCost>> }>;
}

export const EMPTY_BASELINE: InteractionBaseline = { generated: false, frozenNow: "", flows: {} };

/** Folds this run's results into `previous`: flows and modes that did not run are kept. */
export function mergeResults(
  previous: InteractionBaseline,
  results: readonly FlowResult[],
  frozenNow: string,
): InteractionBaseline {
  const flows = structuredClone(previous.flows);
  for (const { flow, title, mode, cost } of results) {
    const entry = flows[flow] ?? { title, runs: {} };
    entry.title = title;
    entry.runs[mode] = cost;
    flows[flow] = entry;
  }
  return { generated: true, frozenNow, flows };
}

/** Stable text: sorted flow keys, modes in RUN_MODES order, no timestamps. */
export function serializeBaseline(baseline: InteractionBaseline): string {
  const flows: InteractionBaseline["flows"] = {};
  for (const [key, { title, runs }] of sortedFlows(baseline)) {
    const ordered: Partial<Record<RunMode, FlowCost>> = {};
    for (const mode of RUN_MODES) if (runs[mode]) ordered[mode] = runs[mode];
    flows[key] = { title, runs: ordered };
  }
  return `${JSON.stringify({ generated: baseline.generated, frozenNow: baseline.frozenNow, flows }, null, 2)}\n`;
}

export interface CostChange {
  flow: string;
  mode: RunMode;
  metric: ComparedMetric;
  baseline: number;
  actual: number;
}

export interface Comparison {
  regressions: CostChange[];
  improvements: CostChange[];
  /** Flow runs with no baseline entry yet. */
  unbaselined: string[];
  /** Baseline flow runs this run did not record: the flow failed or was not run. */
  missing: string[];
}

/** Any compared metric above its baseline is a regression; below it, an improvement. */
export function compareResults(
  baseline: InteractionBaseline,
  results: readonly FlowResult[],
): Comparison {
  const comparison: Comparison = {
    regressions: [],
    improvements: [],
    unbaselined: [],
    missing: [],
  };
  const recorded = new Set(results.map(({ flow, mode }) => `${flow} [${mode}]`));
  for (const [flow, { runs }] of sortedFlows(baseline))
    for (const mode of RUN_MODES)
      if (runs[mode] && !recorded.has(`${flow} [${mode}]`))
        comparison.missing.push(`${flow} [${mode}]`);
  for (const { flow, mode, cost } of results) {
    const expected = baseline.flows[flow]?.runs[mode];
    if (!expected) {
      comparison.unbaselined.push(`${flow} [${mode}]`);
      continue;
    }
    for (const metric of COMPARED_METRICS) {
      const change = { flow, mode, metric, baseline: expected[metric], actual: cost[metric] };
      if (cost[metric] > expected[metric]) comparison.regressions.push(change);
      else if (cost[metric] < expected[metric]) comparison.improvements.push(change);
    }
  }
  return comparison;
}

export const describeChange = (c: CostChange): string =>
  `${c.flow} [${c.mode}] ${c.metric}: ${c.actual} (baseline ${c.baseline}, ${signed(c.actual - c.baseline)})`;

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

const MODE_LABEL: Record<RunMode, string> = {
  "desktop-pointer": "1280 mouse",
  "phone-touch": "375 touch",
  "desktop-keyboard": "1280 keyboard",
};

/** One table: a row per flow and mode, the compared metrics as columns. */
export function baselineTable(baseline: InteractionBaseline): string {
  const lines = [
    "| Flow | Run | Clicks or taps | Keystrokes | Tab hops | Transitions (routes + dialogs) |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
  ];
  for (const [key, { title, runs }] of sortedFlows(baseline)) {
    for (const mode of RUN_MODES) {
      const c = runs[mode];
      if (!c) continue;
      const clicks = c.syntheticClicks
        ? `${c.clicks} (${c.syntheticClicks} select picks)`
        : c.clicks;
      lines.push(
        `| ${title} | ${MODE_LABEL[mode]} | ${clicks} | ${c.keystrokes} | ${c.tabHops} | ${c.transitions} (${c.routeChanges} + ${c.dialogOpens}) |`,
      );
    }
  }
  return lines.join("\n");
}

/** The job summary: what changed against the committed baseline, then this run's table. */
export function comparisonSummary(
  comparison: Comparison,
  run: InteractionBaseline,
  { recorded }: { recorded: boolean },
): string {
  const parts = ["## Interaction cost (E38)", ""];
  if (recorded) {
    parts.push("Recorded a new baseline from this run; nothing was compared.", "");
  } else if (comparison.regressions.length === 0) {
    const scope = comparison.missing.length ? " among the flows that finished" : "";
    parts.push(`No flow costs more than the committed baseline${scope}.`, "");
  } else {
    parts.push(
      `**${comparison.regressions.length} cost increase(s) against the baseline.** Warn-only: this does not fail the job (ED1 option (a)).`,
      "",
      ...comparison.regressions.map((c) => `- ${describeChange(c)}`),
      "",
    );
  }
  if (!recorded && comparison.improvements.length > 0) {
    parts.push(
      `${comparison.improvements.length} improvement(s): regenerate the baseline to lock them in.`,
      "",
      ...comparison.improvements.map((c) => `- ${describeChange(c)}`),
      "",
    );
  }
  if (!recorded && comparison.missing.length > 0) {
    parts.push(
      `**Not measured (the flow failed or did not run):** ${comparison.missing.join(", ")}. A page change may have broken its steps in apps/e2e/interaction/flows.ts.`,
      "",
    );
  }
  if (comparison.unbaselined.length > 0) {
    parts.push(`No baseline yet for: ${comparison.unbaselined.join(", ")}.`, "");
  }
  parts.push("### This run", "", baselineTable(run), "");
  return parts.join("\n");
}

/** docs/audit/interaction-cost/baseline.md: what the numbers mean, then the table. */
export function baselineMarkdown(baseline: InteractionBaseline): string {
  return [
    "# Interaction cost baseline (E38 S0)",
    "",
    "Generated by `INTERACTION_UPDATE_BASELINE=1 bun run test:interaction` (see `apps/e2e/README.md`,",
    '"Interaction cost"). Do not edit by hand. The numbers are in `baseline.json` beside this file.',
    "",
    `Each flow starts from the seeded homeowner persona (onboarding from a cleared user), with the clock ${baseline.frozenNow ? `frozen at ${baseline.frozenNow}` : "not frozen (a local run)"}.`,
    "Every count is what the browser received while the harness did the task as a person would:",
    "",
    "- **Clicks or taps**: pointer presses. Picking an option in a native select is counted as one",
    '  click without being sent (the browser draws that list), shown as "select picks".',
    '- **Keystrokes**: key presses, one per key, so Ctrl+A is two and typing "400" is three.',
    "- **Tab hops**: Tab presses in the keyboard-only run, Tab forward only.",
    "- **Transitions**: path changes plus dialog or sheet opens (an open and close cycle counts once).",
    "",
    "Scrolling is not counted, and neither are menus (such as Self Assessment's Add income).",
    "Self Assessment has no record filter yet, so flow 5 adds and edits records but does not filter.",
    "",
    baselineTable(baseline),
    "",
  ].join("\n");
}

/** The flows by key, so output never depends on the order runs finished in. */
function sortedFlows(baseline: InteractionBaseline) {
  return Object.entries(baseline.flows).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}
