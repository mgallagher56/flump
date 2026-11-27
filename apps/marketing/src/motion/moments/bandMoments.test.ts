// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../loadGsapKit";
import { MOMENT_END } from "./arrive";
import { arriveMoment, dealEachMoment, dealInMoment, setPieceMoment } from "./bandMoments";

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
