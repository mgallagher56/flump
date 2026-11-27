import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../loadGsapKit";
import { MOMENT_END, type MomentTimeline, type SampleMoment } from "../moments/arrive";
import { SAMPLE_MOMENTS } from "./sampleMoments";

type Call = [
  target: unknown,
  from: Record<string, unknown>,
  to: Record<string, unknown>,
  at: number,
];

const kit = {} as GsapKit;

const sample = (html: string): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

const run = (name: string, root: HTMLElement) => {
  const fromTo = vi.fn();
  const moment = SAMPLE_MOMENTS[name] as SampleMoment;
  const moved = moment(kit, { fromTo } as unknown as MomentTimeline, root);
  return { moved, calls: fromTo.mock.calls as Call[] };
};

/** Where each call ends, in arrive units. */
const ends = (calls: Call[]) =>
  calls.map(([target, , to, at]) => {
    const count = Array.isArray(target) ? target.length : 1;
    return at + Number(to.duration ?? 0) + Number(to.stagger ?? 0) * Math.max(0, count - 1);
  });

const COUNT = '<span data-count="10" data-count-from="0" data-format="months">10 months</span>';

describe("SAMPLE_MOMENTS", () => {
  it("names a moment for each sample", () => {
    expect(Object.keys(SAMPLE_MOMENTS)).toEqual([
      "accounts",
      "budget",
      "pay",
      "savings",
      "debt",
      "picture",
    ]);
  });
});

describe("budget: fill the bar", () => {
  const root = () =>
    sample(
      `<svg><rect data-bar-segment></rect><rect data-bar-segment></rect><rect data-bar-left></rect></svg>
       <ol><li data-budget-row></li><li data-budget-row></li></ol>
       <p data-budget-stat></p><p data-budget-stat>${COUNT}</p>`,
    );

  it("fills each outgoing from the left in turn, its row coming up beside it, then what is left over", () => {
    const { calls, moved } = run("budget", root());
    const segments = calls.filter(([, from]) => from.scaleX === 0 && from.opacity === undefined);
    // 1.4 units shared by two segments: 0.7 apart, from 0.3
    expect(segments.map(([, , , at]) => at)).toEqual([0.3, 1]);
    expect(segments[0]?.[1]).toEqual({ scaleX: 0, transformOrigin: "0% 50%" });
    const left = calls.find(([, from]) => from.scaleX === 0 && from.opacity === 0);
    // After both segments: 0.3 + 2 × 0.7 − 0.1 = 1.6
    expect(left?.[3]).toBeCloseTo(1.6, 10);
    expect(moved).toHaveLength(7);
  });

  it("counts the breathing room once, after the bar, and ends before the stop rests", () => {
    const { calls } = run("budget", root());
    const count = calls.find(([target]) => (target as { v?: number }).v !== undefined);
    expect(count?.[2]).toMatchObject({ v: 10, ease: "calm" });
    expect(Math.max(...ends(calls))).toBeLessThanOrEqual(MOMENT_END);
  });
});

describe("savings and debt: draw the line", () => {
  const chart = `<div data-drawn-chart="x" data-values="1,2" data-readouts="a|b" data-min="0" data-max="2">
      <svg><rect data-chart-clip width="600"></rect><circle data-chart-marker></circle>
      <svg data-chart-readout><rect data-readout-box></rect><text data-readout-text>b</text></svg></svg></div>`;

  it("draws the savings line and counts the balance together, from the start of the moment", () => {
    const { calls } = run(
      "savings",
      sample(`${chart}<span data-count="2" data-count-from="1" data-format="gbp">£2</span>`),
    );
    expect(calls.map(([, from, , at]) => [from, at])).toEqual([
      [{ p: 0 }, 0.3],
      [{ v: 1 }, 0.3],
    ]);
    expect(Math.max(...ends(calls))).toBeLessThanOrEqual(MOMENT_END);
  });

  it("brings the debt facts up after the line, before the stop rests", () => {
    const { calls, moved } = run(
      "debt",
      sample(`${chart}<dl><div data-graph-fact></div><div data-graph-fact></div></dl>`),
    );
    const facts = calls.at(-1);
    expect(facts?.[1]).toEqual({ opacity: 0, y: 8 });
    expect(moved).toHaveLength(2);
    expect(Math.max(...ends(calls))).toBeLessThanOrEqual(MOMENT_END);
  });
});

describe("picture: the tiles", () => {
  it("brings each tile up in turn by distance and opacity, each figure counting as it comes", () => {
    const tile = `<p data-tile>${COUNT}</p>`;
    const { calls, moved } = run("picture", sample(tile + tile + tile));
    const tiles = calls.filter(([, from]) => from.y === 16);
    expect(tiles.map(([, , , at]) => at)).toEqual([0.3, 0.55, 0.8]);
    expect(tiles[0]?.[1]).toEqual({ opacity: 0, y: 16 });
    expect(calls.filter(([target]) => (target as { v?: number }).v !== undefined)).toHaveLength(3);
    expect(moved).toHaveLength(3);
    expect(Math.max(...ends(calls))).toBeLessThanOrEqual(MOMENT_END);
  });
});
