import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../loadGsapKit";
import { SAMPLE_MOMENTS, type SampleMoment, seconds } from "./sampleMoments";

// Durations from the marketing calm scale (packages/tokens motion.ts): stagger 196ms,
// hover 588ms, disclosure 980ms, entry 1540ms, chart 2660ms.

type Call = [
  target: unknown,
  from: Record<string, unknown>,
  to: Record<string, unknown>,
  at: number,
];

const fakeTimeline = () => {
  const fromTo = vi.fn();
  return { tl: { fromTo } as unknown as Parameters<SampleMoment>[1], fromTo };
};

const kit = {} as GsapKit;

const sample = (html: string): HTMLElement => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
};

const calls = (fromTo: ReturnType<typeof vi.fn>) => fromTo.mock.calls as Call[];

const run = (name: string, root: HTMLElement, at: number) => {
  const { tl, fromTo } = fakeTimeline();
  const moment = SAMPLE_MOMENTS[name] as SampleMoment;
  const moved = moment(kit, tl, root, at);
  return { moved, calls: calls(fromTo) };
};

describe("seconds", () => {
  it("turns a marketing duration in milliseconds into seconds for GSAP", () => {
    expect(seconds("stagger")).toBe(0.196);
    expect(seconds("chart")).toBe(2.66);
  });
});

describe("SAMPLE_MOMENTS", () => {
  it("names a moment for each sample, savings and debt sharing the line", () => {
    expect(Object.keys(SAMPLE_MOMENTS)).toEqual([
      "accounts",
      "budget",
      "pay",
      "savings",
      "debt",
      "picture",
    ]);
    expect(SAMPLE_MOMENTS.savings).toBe(SAMPLE_MOMENTS.debt);
  });
});

describe("accounts: deal", () => {
  it("deals each card from the deck's centre to its place, one stagger apart", () => {
    const root = sample('<ul data-deck=""><li data-deal=""></li><li data-deal=""></li></ul>');
    const deck = root.querySelector("[data-deck]") as HTMLElement;
    Object.defineProperty(deck, "clientWidth", { value: 400 });
    Object.defineProperty(deck, "clientHeight", { value: 300 });
    const [first, second] = Array.from(root.querySelectorAll<HTMLElement>("[data-deal]"));
    Object.defineProperty(first, "offsetLeft", { value: 50 });
    Object.defineProperty(first, "offsetWidth", { value: 100 });
    Object.defineProperty(first, "offsetTop", { value: 10 });
    Object.defineProperty(first, "offsetHeight", { value: 40 });

    const { moved, calls: c } = run("accounts", root, 1);

    expect(moved).toEqual([first, second]);
    expect(c).toHaveLength(2);
    expect(c[0]?.[0]).toBe(first);
    const from = c[0]?.[1] as { x: () => number; y: () => number; opacity: number };
    // x: 400 / 2 - (50 + 100 / 2) = 200 - 100 = 100; y: 300 / 2 - (10 + 40 / 2) = 150 - 30 = 120.
    expect(from.x()).toBe(100);
    expect(from.y()).toBe(120);
    expect(from.opacity).toBe(0);
    expect(c[0]?.[2]).toEqual({ x: 0, y: 0, opacity: 1, duration: 0.98, ease: "calmInOut" });
    expect(c[0]?.[3]).toBe(1);
    // The second card starts one stagger later: 1 + 0.196.
    expect(c[1]?.[0]).toBe(second);
    expect(c[1]?.[3]).toBeCloseTo(1.196, 10);
  });

  it("moves nothing when the sample has no deck", () => {
    const { moved, calls: c } = run("accounts", sample('<li data-deal=""></li>'), 0);
    expect(moved).toEqual([]);
    expect(c).toEqual([]);
  });
});

describe("budget: fillBar", () => {
  it("fills each segment in turn with its row beside it, then shows what is left", () => {
    const root = sample(
      '<div data-bar-segment=""></div><div data-bar-segment=""></div>' +
        '<p data-budget-row=""></p><p data-bar-left=""></p>',
    );
    const [seg1, seg2] = Array.from(root.querySelectorAll("[data-bar-segment]"));
    const row1 = root.querySelector("[data-budget-row]");
    const left = root.querySelector("[data-bar-left]");

    const { moved, calls: c } = run("budget", root, 2);

    expect(moved).toEqual([seg1, seg2, row1, left]);
    // Segment 1, row 1, segment 2 (no second row), then the left-over line.
    expect(c.map((call) => call[0])).toEqual([seg1, row1, seg2, [left]]);
    expect(c[0]?.[1]).toEqual({ scaleX: 0, transformOrigin: "0% 50%" });
    expect(c[0]?.[2]).toEqual({ scaleX: 1, duration: 0.588, ease: "calmInOut" });
    expect(c[0]?.[3]).toBe(2);
    expect(c[1]?.[1]).toEqual({ opacity: 0, y: 6 });
    expect(c[1]?.[2]).toEqual({ opacity: 1, y: 0, duration: 0.588, ease: "calm" });
    expect(c[1]?.[3]).toBe(2);
    expect(c[2]?.[3]).toBeCloseTo(2.196, 10);
    // After both segments: 2 + 2 x 0.196 = 2.392.
    expect(c[3]?.[1]).toEqual({ opacity: 0 });
    expect(c[3]?.[3]).toBeCloseTo(2.392, 10);
  });
});

describe("pay: unfold", () => {
  it("turns the lower third down, then the top up 0.7 of a turn later", () => {
    const root = sample('<div data-fold="top"></div><div data-fold="bottom"></div>');
    const top = root.querySelector("[data-fold=top]");
    const bottom = root.querySelector("[data-fold=bottom]");

    const { moved, calls: c } = run("pay", root, 1);

    expect(moved).toEqual([bottom, top]);
    expect(c[0]?.[0]).toBe(bottom);
    expect(c[0]?.[1]).toEqual({ rotationX: -90, opacity: 0 });
    expect(c[0]?.[2]).toEqual({ rotationX: 0, opacity: 1, duration: 0.98, ease: "calmInOut" });
    expect(c[0]?.[3]).toBe(1);
    expect(c[1]?.[0]).toBe(top);
    expect(c[1]?.[1]).toEqual({ rotationX: 90, opacity: 0 });
    // 1 + 0.98 x 0.7 = 1.686.
    expect(c[1]?.[3]).toBeCloseTo(1.686, 10);
  });

  it("moves only the folds that are there", () => {
    const onlyTop = run("pay", sample('<div data-fold="top"></div>'), 0);
    expect(onlyTop.calls).toHaveLength(1);
    expect(onlyTop.calls[0]?.[1]).toEqual({ rotationX: 90, opacity: 0 });
    expect(onlyTop.moved).toHaveLength(1);

    const none = run("pay", sample("<p></p>"), 0);
    expect(none.calls).toEqual([]);
    expect(none.moved).toEqual([]);
  });
});

describe("savings and debt: drawLine", () => {
  it("widens the clip to its full width, then settles the marker after the chart", () => {
    const root = sample(
      '<svg><rect data-chart-clip="" width="320"></rect><circle data-chart-marker=""></circle></svg>',
    );
    const clip = root.querySelector("[data-chart-clip]");
    const marker = root.querySelector("[data-chart-marker]");

    const { moved, calls: c } = run("savings", root, 0.5);

    // The clip carries no transform, so only the marker is cleared afterwards.
    expect(moved).toEqual([marker]);
    expect(c[0]?.[0]).toBe(clip);
    expect(c[0]?.[1]).toEqual({ attr: { width: 0 } });
    expect(c[0]?.[2]).toEqual({ attr: { width: 320 }, duration: 2.66, ease: "calmInOut" });
    expect(c[0]?.[3]).toBe(0.5);
    expect(c[1]?.[0]).toBe(marker);
    expect(c[1]?.[2]).toEqual({ opacity: 1, duration: 0.588, ease: "calm" });
    // 0.5 + 2.66 = 3.16.
    expect(c[1]?.[3]).toBeCloseTo(3.16, 10);
  });

  it("draws the line with no marker, and nothing with no clip", () => {
    const noMarker = run(
      "debt",
      sample('<svg><rect data-chart-clip="" width="90"></rect></svg>'),
      0,
    );
    expect(noMarker.moved).toEqual([]);
    expect(noMarker.calls).toHaveLength(1);
    expect(noMarker.calls[0]?.[2]).toMatchObject({ attr: { width: 90 } });

    const noClip = run("debt", sample('<svg><circle data-chart-marker=""></circle></svg>'), 0);
    expect(noClip.moved).toEqual([]);
    expect(noClip.calls).toEqual([]);
  });
});

describe("picture: tiles", () => {
  it("brings the tiles in together, one stagger apart", () => {
    const root = sample('<p data-tile=""></p><p data-tile=""></p><p data-tile=""></p>');
    const items = Array.from(root.querySelectorAll("[data-tile]"));

    const { moved, calls: c } = run("picture", root, 0.98);

    expect(moved).toEqual(items);
    expect(c).toHaveLength(1);
    expect(c[0]?.[0]).toEqual(items);
    expect(c[0]?.[1]).toEqual({ opacity: 0, y: 16 });
    expect(c[0]?.[2]).toEqual({
      opacity: 1,
      y: 0,
      duration: 1.54,
      ease: "calm",
      stagger: 0.196,
    });
    expect(c[0]?.[3]).toBe(0.98);
  });
});
