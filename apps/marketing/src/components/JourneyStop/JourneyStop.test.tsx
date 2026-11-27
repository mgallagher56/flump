import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import type { useGsapMoment } from "../../motion/useGsapMoment";
import { JourneyStop } from "./JourneyStop";
import { JOURNEY_STOPS } from "./journeyStops";

type Setup = Parameters<typeof useGsapMoment>[1];
const moment = vi.hoisted(() => ({ setup: undefined as unknown, deps: undefined as unknown }));
vi.mock("../../motion/useGsapMoment", () => ({
  useGsapMoment: (_ref: unknown, setup: unknown, deps: unknown) => {
    moment.setup = setup;
    moment.deps = deps;
  },
}));

const renderStop = (index: number) =>
  render(
    <MemoryRouter>
      <ol>
        <JourneyStop index={index} stop={JOURNEY_STOPS[index] as (typeof JOURNEY_STOPS)[number]} />
      </ol>
    </MemoryRouter>,
  );

describe("JourneyStop", () => {
  it("shows the stop's name, title, lead, fact and link, labelled by its title", () => {
    renderStop(1);
    const article = screen.getByRole("article", { name: "Budget and breathing room" });
    expect(article.id).toBe("journey-stop-budget");
    expect(screen.getByText("Budget")).toBeTruthy();
    expect(
      screen.getByText("What comes in, what goes out and what is left over each month."),
    ).toBeTruthy();
    expect(
      screen.getByText("Flump shows what is left over each month, or how much you are short."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "About budget in Flump" }).getAttribute("href")).toBe(
      "/features/budget",
    );
  });

  it("marks its place for the orb's track with a decorative dot in the name", () => {
    const { container } = renderStop(0);
    const marker = container.querySelector("[data-stop-marker]");
    expect(marker?.getAttribute("aria-hidden")).toBe("true");
    expect(marker?.className).not.toMatch(/violet|rose|series[45]|accentPurple/);
  });

  it("ends the journey at the preview, with no invite button", () => {
    renderStop(5);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Request an invite")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Open the interactive preview" }).getAttribute("href"),
    ).toBe("/preview");
  });

  it("covers the six stops in reading order, five areas then the picture", () => {
    expect(JOURNEY_STOPS.map((s) => s.key)).toEqual([
      "accounts",
      "budget",
      "pay",
      "savings-and-pension",
      "debt-and-borrowing",
      "picture",
    ]);
    // No orb colour is paired with a debt (STYLE-GUIDE MC2): debt's orb is sky, never violet or rose.
    expect(JOURNEY_STOPS.find((s) => s.key === "debt-and-borrowing")?.orbTone).toBe("sky");
  });
});

describe("JourneyStop's arrival", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A GSAP kit that records the timeline, the trigger and the clearing `set`. */
  const fakeKit = () => {
    const tl = {
      fromTo: vi.fn(),
      play: vi.fn(),
      eventCallback: vi.fn(),
    };
    const timeline = vi.fn(() => tl);
    const set = vi.fn();
    const create = vi.fn();
    const kit = { gsap: { timeline, set }, ScrollTrigger: { create } } as unknown as GsapKit;
    return { kit, tl, timeline, set, create };
  };

  /** Renders stop `index` with its top `top` pixels down a 1000px-high window, and runs its moment. */
  const arrive = (index: number, top: number, prepare?: (root: HTMLElement) => void) => {
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(1000);
    const { container } = renderStop(index);
    const root = container.querySelector("li") as HTMLElement;
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({ top } as DOMRect);
    prepare?.(root);
    const fake = fakeKit();
    const extra = (moment.setup as Setup)(fake.kit, root);
    return { ...fake, root, extra };
  };

  it("re-runs only when the stop changes", () => {
    renderStop(2);
    expect(moment.deps).toEqual(["pay"]);
  });

  it("leaves a stop already past 85% of the screen finished, with no timeline", () => {
    // 0.85 x 1000 = 850: a top at 849 is already reached.
    const { timeline, create, extra } = arrive(0, 849);
    expect(timeline).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(extra).toBeUndefined();
  });

  it("from 85% down, raises both sides then plays the sample's moment, once on scroll", () => {
    const { tl, timeline, create, root, extra } = arrive(1, 850);
    const sides = Array.from(root.querySelectorAll("[data-stop-side]"));
    expect(sides).toHaveLength(2);
    expect(extra).toBeUndefined();
    expect(timeline).toHaveBeenCalledWith({ paused: true });
    // Opacity and a 24px rise only, over the entry duration (1540ms), the sides 196ms apart.
    const [targets, from, to, at] = tl.fromTo.mock.calls[0] as unknown[];
    expect((targets as Element[]).length).toBe(2);
    expect((targets as Element[])[0]).toBe(sides[0]);
    expect((targets as Element[])[1]).toBe(sides[1]);
    expect(from).toEqual({ opacity: 0, y: 24 });
    expect(to).toEqual({ opacity: 1, y: 0, duration: 1.54, ease: "calm", stagger: 0.196 });
    expect(at).toBe(0);
    // The budget sample's bar starts after the disclosure duration (980ms).
    const segment = root.querySelector("[data-bar-segment]");
    const barCall = tl.fromTo.mock.calls.find((call) => call[0] === segment);
    expect(barCall?.[3]).toBe(0.98);

    expect(create).toHaveBeenCalledTimes(1);
    const trigger = create.mock.calls[0]?.[0] as {
      trigger: Element;
      start: string;
      once: boolean;
      scrub?: unknown;
      onEnter: () => void;
    };
    expect(trigger.trigger).toBe(root);
    expect(trigger.start).toBe("top 85%");
    expect(trigger.once).toBe(true);
    expect(trigger.scrub).toBeUndefined();
    expect(tl.play).not.toHaveBeenCalled();
    trigger.onEnter();
    expect(tl.play).toHaveBeenCalledTimes(1);
  });

  it("clears every transform and inline opacity it set once the timeline completes", () => {
    const { tl, set, root } = arrive(1, 900);
    expect(tl.eventCallback.mock.calls[0]?.[0]).toBe("onComplete");
    expect(set).not.toHaveBeenCalled();
    const onComplete = tl.eventCallback.mock.calls[0]?.[1] as () => void;
    onComplete();
    const sides = Array.from(root.querySelectorAll("[data-stop-side]"));
    const cleared = set.mock.calls[0]?.[0] as Element[];
    expect(cleared[0]).toBe(sides[0]);
    expect(cleared[1]).toBe(sides[1]);
    // Both sides, then the budget sample's segments, rows and left-over line.
    expect(cleared.length).toBeGreaterThan(2);
    expect(cleared.includes(root.querySelector("[data-bar-segment]") as Element)).toBe(true);
    expect(set.mock.calls[0]?.[1]).toEqual({ clearProps: "transform,opacity" });
  });

  it("raises only the sides when the sample has no moment of its own", () => {
    const { tl, set, root } = arrive(1, 900, (r) => {
      r.querySelector("[data-sample]")?.setAttribute("data-sample", "unknown");
    });
    expect(tl.fromTo).toHaveBeenCalledTimes(1);
    const onComplete = tl.eventCallback.mock.calls[0]?.[1] as () => void;
    onComplete();
    const cleared = set.mock.calls[0]?.[0] as Element[];
    const sides = Array.from(root.querySelectorAll("[data-stop-side]"));
    expect(cleared.length).toBe(2);
    expect(cleared[0]).toBe(sides[0]);
    expect(cleared[1]).toBe(sides[1]);
  });

  it("raises only the sides when there is no sample", () => {
    const { tl } = arrive(1, 900, (r) => {
      r.querySelector("[data-sample]")?.remove();
    });
    expect(tl.fromTo).toHaveBeenCalledTimes(1);
  });
});
