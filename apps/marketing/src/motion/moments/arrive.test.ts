// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../loadGsapKit";
import {
  arriveSeconds,
  leaveSeconds,
  MOMENT_END,
  pairArrive,
  pairLeave,
  sampleArrive,
  seconds,
} from "./arrive";

// The marketing calm scale (packages/tokens motion.ts): entry 1540ms, disclosure 980ms.

const fakeKit = () => {
  const tl = {
    fromTo: vi.fn(),
    set: vi.fn(),
    timeScale: vi.fn(),
    duration: vi.fn(() => MOMENT_END),
    eventCallback: vi.fn(),
  };
  const gsap = { timeline: vi.fn(() => tl), set: vi.fn(), fromTo: vi.fn() };
  return { kit: { gsap } as unknown as GsapKit, tl, gsap };
};

describe("timing", () => {
  it("takes every duration from the calm scale", () => {
    expect(seconds("disclosure")).toBe(0.98);
    // 1.54 × 1.6 = 2.464
    expect(arriveSeconds()).toBeCloseTo(2.464, 10);
    // 1.54 × 0.45 = 0.693
    expect(leaveSeconds()).toBeCloseTo(1.54 * 0.45, 10);
  });
});

describe("pairArrive", () => {
  it("brings both sides up from hidden together (by opacity, so their links stay in the Tab order), the lines after, and scales the whole to the arrive", () => {
    const { kit, tl, gsap } = fakeKit();
    const sides = ["text", "sample"];
    const lines = ["kicker", "title"];
    const moment = vi.fn(() => ["card"]);
    pairArrive(kit, {
      sides: sides as unknown as Element[],
      lines: lines as unknown as Element[],
      sample: { root: {} as HTMLElement, moment },
    });
    expect(gsap.timeline).toHaveBeenCalledWith({ defaults: { ease: "calm" } });
    expect(tl.fromTo.mock.calls[0]).toEqual([
      sides,
      { y: 24, opacity: 0, pointerEvents: "none" },
      { y: 0, opacity: 1, pointerEvents: "auto", duration: 1 },
      0,
    ]);
    expect(tl.fromTo.mock.calls[1]?.[1]).toEqual({ y: 12, opacity: 0 });
    expect(tl.fromTo.mock.calls[1]?.[3]).toBe(0.15);
    expect(moment).toHaveBeenCalledWith(kit, tl, {});
    // Ends at MOMENT_END, scaled so 2.4 units take arriveSeconds(): 2.4 / 2.464
    expect(tl.set).toHaveBeenCalledWith({}, {}, MOMENT_END);
    expect(tl.timeScale.mock.calls[0]?.[0]).toBeCloseTo(2.4 / 2.464, 10);
    // At rest, every transform it left is cleared (MK3).
    const onComplete = tl.eventCallback.mock.calls[0]?.[1] as () => void;
    onComplete();
    expect(gsap.set).toHaveBeenCalledWith(["text", "sample", "kicker", "title", "card"], {
      clearProps: "transform",
    });
  });

  it.each([
    ["no sample", undefined],
    ["a sample with no moment of its own", { root: {} as HTMLElement }],
  ])("plays only the pair with %s, and clears only the pair's transforms", (_name, sample) => {
    const { kit, tl, gsap } = fakeKit();
    pairArrive(kit, {
      sides: ["text"] as unknown as Element[],
      lines: ["title"] as unknown as Element[],
      ...(sample ? { sample } : {}),
    });
    // The sides and the lines only: no moment's calls.
    expect(tl.fromTo).toHaveBeenCalledTimes(2);
    const onComplete = tl.eventCallback.mock.calls[0]?.[1] as () => void;
    onComplete();
    expect(gsap.set).toHaveBeenCalledWith(["text", "title"], { clearProps: "transform" });
  });
});

describe("sampleArrive", () => {
  it("plays only the sample's moment, paused until scroll starts it, on the arrive's calm duration", () => {
    const { kit, tl, gsap } = fakeKit();
    const moment = vi.fn(() => ["card"]);
    sampleArrive(kit, { root: {} as HTMLElement, moment });
    expect(gsap.timeline).toHaveBeenCalledWith({ paused: true, defaults: { ease: "calm" } });
    // No rise or fade of the sides: the cards are never hidden in this mode.
    expect(tl.fromTo).not.toHaveBeenCalled();
    expect(moment).toHaveBeenCalledWith(kit, tl, {});
    expect(tl.set).toHaveBeenCalledWith({}, {}, MOMENT_END);
    expect(tl.timeScale.mock.calls[0]?.[0]).toBeCloseTo(2.4 / 2.464, 10);
    const onComplete = tl.eventCallback.mock.calls[0]?.[1] as () => void;
    onComplete();
    expect(gsap.set).toHaveBeenCalledWith(["card"], { clearProps: "transform" });
  });
});

describe("pairLeave", () => {
  it("lifts and fades the pair out together on time, paused, and leaves it untouched until played", () => {
    const { kit, gsap } = fakeKit();
    pairLeave(kit, "pair" as unknown as Element);
    const [target, from, to] = gsap.fromTo.mock.calls[0] as [
      unknown,
      unknown,
      Record<string, unknown>,
    ];
    expect(target).toBe("pair");
    // By opacity, never visibility: a pair that has gone keeps its links in the Tab order.
    expect(from).toEqual({ opacity: 1, y: 0, pointerEvents: "auto" });
    expect(to).not.toHaveProperty("autoAlpha");
    expect(to).toMatchObject({
      opacity: 0,
      pointerEvents: "none",
      y: -20,
      ease: "calmInOut",
      paused: true,
      immediateRender: false,
    });
    expect(to.duration).toBeCloseTo(1.54 * 0.45, 10);
  });
});
