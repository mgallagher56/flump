// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../loadGsapKit";
import { MOMENT_END } from "./arrive";
import {
  arriveMoment,
  dealEachMoment,
  dealInMoment,
  setPieceMoment,
  unstackMoment,
} from "./bandMoments";

// The marketing calm scale (packages/tokens motion.ts): entry 1540ms, stagger 196ms.

const fakeKit = () => {
  const tl = {
    set: vi.fn(),
    timeScale: vi.fn(),
    duration: vi.fn(() => MOMENT_END),
    eventCallback: vi.fn(),
    play: vi.fn(),
  };
  const gsap = { from: vi.fn(), set: vi.fn(), timeline: vi.fn(() => tl) };
  const ScrollTrigger = { create: vi.fn() };
  return { kit: { gsap, ScrollTrigger } as unknown as GsapKit, gsap, tl, ScrollTrigger };
};

const rootWith = (items: unknown[]) =>
  ({ querySelectorAll: vi.fn(() => items) }) as unknown as HTMLElement;

describe("arriveMoment", () => {
  it("brings the band's items up from a short rise and a fade, in turn, once, on time, clearing at rest", () => {
    const { kit, gsap } = fakeKit();
    const root = rootWith(["a", "b"]);
    arriveMoment("[data-arrive-item]", 12)(kit, root);
    expect(root.querySelectorAll).toHaveBeenCalledWith("[data-arrive-item]");
    expect(gsap.from).toHaveBeenCalledWith(["a", "b"], {
      y: 12,
      opacity: 0,
      duration: 1.54,
      stagger: 0.196,
      ease: "calm",
      clearProps: "transform,opacity",
      scrollTrigger: { trigger: root, start: "top 86%", once: true },
    });
  });

  it("does nothing for a band with no items", () => {
    const { kit, gsap } = fakeKit();
    arriveMoment("x")(kit, rootWith([]));
    expect(gsap.from).not.toHaveBeenCalled();
  });
});

describe("dealInMoment and dealEachMoment", () => {
  it("deals a list in, 12px and a fade, staggered from the list's own trigger", () => {
    const { kit, gsap } = fakeKit();
    const root = rootWith(["a", "b"]);
    dealInMoment("li")(kit, root);
    expect(gsap.from).toHaveBeenCalledTimes(1);
    expect(gsap.from.mock.calls[0]?.[1]).toMatchObject({
      y: 12,
      stagger: 0.196,
      scrollTrigger: { trigger: root, start: "top 90%", once: true },
    });
  });

  it("deals each item in on its own trigger, so a long list arrives as it is read", () => {
    const { kit, gsap } = fakeKit();
    dealEachMoment("section")(kit, rootWith(["a", "b", "c"]));
    expect(gsap.from.mock.calls.map((call) => call[1].scrollTrigger.trigger)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("unstackMoment (prototype 10's cascade)", () => {
  const sheet = (offsetTop: number, child?: unknown) =>
    ({ offsetTop, querySelector: vi.fn(() => child ?? null) }) as unknown as HTMLElement;
  const unstackKit = (units: number) => {
    let complete = () => {};
    const tl = {
      to: vi.fn(() => tl),
      play: vi.fn(),
      duration: vi.fn(() => units),
      timeScale: vi.fn(),
      eventCallback: vi.fn((_: string, fn: () => void) => {
        complete = fn;
      }),
    };
    const gsap = { timeline: vi.fn(() => tl), set: vi.fn() };
    const ScrollTrigger = { create: vi.fn() };
    const kit = { gsap, ScrollTrigger } as unknown as GsapKit;
    const trigger = () =>
      ScrollTrigger.create.mock.calls[0]?.[0] as Record<string, unknown> & {
        onEnter: () => void;
        onLeave: () => void;
        onRefresh: () => void;
      };
    return { kit, gsap, tl, trigger, done: () => complete() };
  };

  it("stacks the sheets on the first, 7px apart and 20px back, the rest at 85%, then deals them out in turn", () => {
    const { kit, gsap, tl } = unstackKit(0.98);
    const sheets = [sheet(0), sheet(80), sheet(160)];
    unstackMoment("li")(kit, rootWith(sheets));
    const [targets, from] = gsap.set.mock.calls[0] as unknown as [
      unknown[],
      Record<string, unknown>,
    ];
    expect(targets).toEqual(sheets);
    const value = (key: string) => (i: number) => (from[key] as (i: number) => number)(i);
    expect([0, 1, 2].map(value("y"))).toEqual([0, -73, -146]);
    expect([0, 1, 2].map(value("z"))).toEqual([-0, -20, -40]);
    expect([0, 1, 2].map(value("opacity"))).toEqual([1, 0.85, 0.85]);
    expect(from).toMatchObject({ transformPerspective: 1200, transformOrigin: "50% 0%" });
    expect(gsap.timeline).toHaveBeenCalledWith({ paused: true });
    expect(tl.to).toHaveBeenCalledWith(sheets, {
      y: 0,
      z: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.12,
      ease: "calmInOut",
    });
  });

  it("plays once when the list's top reaches 85% of the window, never scrubbed", () => {
    const { kit, tl, trigger } = unstackKit(0.98);
    const root = rootWith([sheet(0), sheet(80)]);
    unstackMoment("li")(kit, root);
    expect(trigger()).toMatchObject({ trigger: root, start: "top 85%", once: true });
    expect(trigger().scrub).toBeUndefined();
    expect(tl.play).not.toHaveBeenCalled();
    trigger().onEnter();
    expect(tl.play).toHaveBeenCalledTimes(1);
  });

  it("plays when arriving from below the band, and restacks on a refresh only before it plays", () => {
    const { kit, gsap, tl, trigger } = unstackKit(0.98);
    unstackMoment("li")(kit, rootWith([sheet(0), sheet(80)]));
    trigger().onRefresh();
    expect(gsap.set).toHaveBeenCalledTimes(2);
    trigger().onLeave();
    expect(tl.play).toHaveBeenCalledTimes(1);
    trigger().onRefresh();
    expect(gsap.set).toHaveBeenCalledTimes(2);
  });

  it("plays the whole cascade in the arrive's time (1.54 × 1.6 s), however many sheets", () => {
    const { kit, tl } = unstackKit(0.86);
    unstackMoment("li")(kit, rootWith([sheet(0), sheet(1)]));
    expect(tl.timeScale.mock.calls[0]?.[0]).toBeCloseTo(0.86 / 2.464, 10);
  });

  it("moves each sheet's inner card when asked, and clears everything at rest", () => {
    const { kit, gsap, done } = unstackKit(0.5);
    const cards = ["card a", "card b"];
    unstackMoment("li", ":scope > *")(kit, rootWith([sheet(0, cards[0]), sheet(50, cards[1])]));
    expect((gsap.set.mock.calls[0] as unknown as [unknown[]])[0]).toEqual(cards);
    done();
    expect(gsap.set).toHaveBeenLastCalledWith(cards, {
      clearProps: "transform,transformOrigin,opacity",
    });
  });

  it("does nothing on a list with no sheets", () => {
    const { kit, gsap } = unstackKit(0);
    unstackMoment("li")(kit, rootWith([]));
    expect(gsap.timeline).not.toHaveBeenCalled();
  });
});

describe("setPieceMoment", () => {
  it("builds the sample's moment in a paused timeline, scaled to 2.2 entries, played once when well in view", () => {
    const { kit, tl, ScrollTrigger } = fakeKit();
    const moment = vi.fn(() => []);
    const root = {} as HTMLElement;
    setPieceMoment(moment)(kit, root);
    expect(moment).toHaveBeenCalledWith(kit, tl, root);
    expect(tl.set).toHaveBeenCalledWith({}, {}, MOMENT_END);
    // 2.4 units over 1.54 × 2.2 = 3.388 s.
    expect(tl.timeScale.mock.calls[0]?.[0]).toBeCloseTo(2.4 / 3.388, 10);
    const trigger = ScrollTrigger.create.mock.calls[0]?.[0];
    expect(trigger).toMatchObject({ trigger: root, start: "top 78%", once: true });
    expect(tl.play).not.toHaveBeenCalled();
    trigger.onEnter();
    expect(tl.play).toHaveBeenCalledTimes(1);
  });
});
