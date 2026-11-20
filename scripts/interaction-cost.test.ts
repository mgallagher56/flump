import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  baselineTable,
  compareResults,
  comparisonSummary,
  costLimit,
  type FlowCost,
  type InteractionBaseline,
  mergeResults,
  RUN_MODES,
  serializeBaseline,
} from "../apps/e2e/interaction/report";

const repoRoot = resolve(import.meta.dir, "..");

const cost = (overrides: Partial<FlowCost> = {}): FlowCost => ({
  clicks: 4,
  keystrokes: 10,
  tabHops: 0,
  routeChanges: 1,
  dialogOpens: 2,
  dialogCloses: 2,
  transitions: 3,
  syntheticClicks: 0,
  ...overrides,
});

const baseline: InteractionBaseline = {
  generated: true,
  frozenNow: "2026-11-14T12:00:00Z",
  flows: { "1-budget": { title: "1. Budget", runs: { "desktop-pointer": cost() } } },
};

describe("interaction cost comparison (E38 S0)", () => {
  test("the same costs are neither a regression nor an improvement", () => {
    expect(
      compareResults(baseline, [
        { flow: "1-budget", title: "1. Budget", mode: "desktop-pointer", cost: cost() },
      ]),
    ).toEqual({ regressions: [], overBudget: [], improvements: [], unbaselined: [], missing: [] });
  });

  test("a rise in any compared metric is a regression, a fall an improvement", () => {
    // Clicks 4 -> 6 (+2), keystrokes 10 -> 7 (-3), transitions 3 -> 4 (+1). Route changes and
    // dialog closes are not compared on their own: they are inside transitions.
    const result = compareResults(baseline, [
      {
        flow: "1-budget",
        title: "1. Budget",
        mode: "desktop-pointer",
        cost: cost({ clicks: 6, keystrokes: 7, transitions: 4, dialogCloses: 9 }),
      },
    ]);
    expect(result.regressions.map((c) => [c.metric, c.baseline, c.actual])).toEqual([
      ["clicks", 4, 6],
      ["transitions", 3, 4],
    ]);
    expect(result.improvements.map((c) => [c.metric, c.baseline, c.actual])).toEqual([
      ["keystrokes", 10, 7],
    ]);
  });

  test("the budget: one click more, no extra transition, 10% more keys or hops rounded up", () => {
    // Clicks 4 -> limit 5. Transitions 3 -> limit 3. Keystrokes 27 -> 27 x 1.1 = 29.7, up to 30.
    // Tab hops 100 -> exactly 110 (not 111 from floating point). Tab hops 0 -> 0.
    expect(costLimit("clicks", 4)).toBe(5);
    expect(costLimit("transitions", 3)).toBe(3);
    expect(costLimit("keystrokes", 27)).toBe(30);
    expect(costLimit("tabHops", 100)).toBe(110);
    expect(costLimit("tabHops", 0)).toBe(0);
  });

  test("a rise within budget is a regression only; above it, over budget too", () => {
    // Baseline clicks 4, keystrokes 10, transitions 3. Clicks 5 is +1 (within), keystrokes 12 is
    // above 10 x 1.1 = 11 (over), transitions 4 is +1 (over: no extra transition is allowed).
    const result = compareResults(baseline, [
      {
        flow: "1-budget",
        title: "1. Budget",
        mode: "desktop-pointer",
        cost: cost({ clicks: 5, keystrokes: 12, transitions: 4 }),
      },
    ]);
    expect(result.regressions.map((c) => c.metric)).toEqual([
      "clicks",
      "keystrokes",
      "transitions",
    ]);
    expect(result.overBudget.map((c) => [c.metric, c.baseline, c.actual])).toEqual([
      ["keystrokes", 10, 12],
      ["transitions", 3, 4],
    ]);
    const summary = comparisonSummary(result, baseline, { recorded: false });
    expect(summary).toContain("2 over budget: this fails the job.");
    expect(summary).toContain("transitions: 4 (baseline 3, +1) **over budget (limit 3)**");
  });

  test("a flow or mode with no baseline entry is listed, not compared", () => {
    const result = compareResults(baseline, [
      { flow: "1-budget", title: "1. Budget", mode: "phone-touch", cost: cost() },
      { flow: "9-new", title: "9. New", mode: "desktop-pointer", cost: cost() },
    ]);
    expect(result.unbaselined).toEqual(["1-budget [phone-touch]", "9-new [desktop-pointer]"]);
    expect(result.regressions).toEqual([]);
  });

  test("a baseline run this run did not record is missing, and the summary says so", () => {
    // The baseline has 1-budget [desktop-pointer]; this run only recorded phone-touch (no
    // baseline yet), so the pointer run failed or did not run.
    const comparison = compareResults(baseline, [
      { flow: "1-budget", title: "1. Budget", mode: "phone-touch", cost: cost() },
    ]);
    expect(comparison.missing).toEqual(["1-budget [desktop-pointer]"]);
    const summary = comparisonSummary(comparison, baseline, { recorded: false });
    expect(summary).toContain("among the flows that finished");
    expect(summary).toContain(
      "Not measured (the flow failed or did not run):** 1-budget [desktop-pointer]",
    );
  });

  test("merging keeps runs that did not take part and replaces those that did", () => {
    const merged = mergeResults(
      baseline,
      [{ flow: "1-budget", title: "1. Budget", mode: "phone-touch", cost: cost({ clicks: 9 }) }],
      "",
    );
    expect(merged.generated).toBe(true);
    expect(merged.frozenNow).toBe("");
    expect(merged.flows["1-budget"].runs["desktop-pointer"]).toEqual(cost());
    expect(merged.flows["1-budget"].runs["phone-touch"]?.clicks).toBe(9);
    // The input is not changed.
    expect(baseline.flows["1-budget"].runs["phone-touch"]).toBeUndefined();
  });

  test("the serialised baseline is stable: sorted flows, modes in run order", () => {
    const shuffled: InteractionBaseline = {
      generated: true,
      frozenNow: "",
      flows: {
        "2-b": { title: "B", runs: { "desktop-keyboard": cost(), "desktop-pointer": cost() } },
        "1-a": { title: "A", runs: { "phone-touch": cost() } },
      },
    };
    const text = serializeBaseline(shuffled);
    expect(text.indexOf('"1-a"')).toBeLessThan(text.indexOf('"2-b"'));
    expect(text.indexOf('"desktop-pointer"')).toBeLessThan(text.indexOf('"desktop-keyboard"'));
    expect(serializeBaseline(JSON.parse(text))).toBe(text);
  });

  test("the summary says a rise within budget is a warning only", () => {
    const summary = comparisonSummary(
      compareResults(baseline, [
        {
          flow: "1-budget",
          title: "1. Budget",
          mode: "desktop-pointer",
          cost: cost({ clicks: 5 }),
        },
      ]),
      baseline,
      { recorded: false },
    );
    expect(summary).toContain("1 cost increase(s)");
    // Clicks 4 -> 5 is +1, inside the one-click budget.
    expect(summary).toContain("all within budget");
    expect(summary).toContain("a warning only");
    expect(summary).toContain("1-budget [desktop-pointer] clicks: 5 (baseline 4, +1)");
  });

  test("the table shows select picks beside the clicks they are part of", () => {
    const table = baselineTable({
      ...baseline,
      flows: {
        x: { title: "X", runs: { "phone-touch": cost({ clicks: 7, syntheticClicks: 1 }) } },
      },
    });
    expect(table).toContain("| X | 375 touch | 7 (1 select picks) | 10 | 0 | 3 (1 + 2) |");
  });
});

describe("the committed baseline", () => {
  const committed = JSON.parse(
    readFileSync(resolve(repoRoot, "docs/audit/interaction-cost/baseline.json"), "utf8"),
  ) as InteractionBaseline;

  test("covers the seven core flows in all three modes", () => {
    expect(Object.keys(committed.flows)).toHaveLength(7);
    for (const [flow, { runs }] of Object.entries(committed.flows))
      expect(Object.keys(runs), flow).toEqual([...RUN_MODES]);
  });

  test("is in serialised form, so regenerating it changes only real numbers", () => {
    const text = readFileSync(
      resolve(repoRoot, "docs/audit/interaction-cost/baseline.json"),
      "utf8",
    );
    expect(serializeBaseline(committed)).toBe(text);
  });

  test("keyboard runs use no pointer, pointer runs use no Tab", () => {
    for (const [flow, { runs }] of Object.entries(committed.flows)) {
      expect(runs["desktop-keyboard"]?.clicks, flow).toBe(0);
      expect(runs["desktop-pointer"]?.tabHops, flow).toBe(0);
      expect(runs["phone-touch"]?.tabHops, flow).toBe(0);
    }
  });
});
