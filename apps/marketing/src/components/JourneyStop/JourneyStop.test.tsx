import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import type { useGsapMoment } from "../../motion/useGsapMoment";
import { STOP_ARRIVE_EVENT } from "../HomeStopControl";
import { JourneyStop } from "./JourneyStop";
import { JOURNEY_STOPS, type JourneyStopCopy } from "./journeyStops";

type Setup = Parameters<typeof useGsapMoment>[1];
const moment = vi.hoisted(() => ({ setup: undefined as unknown, deps: undefined as unknown }));
vi.mock("../../motion/useGsapMoment", () => ({
  useGsapMoment: (_ref: unknown, setup: unknown, deps: unknown) => {
    moment.setup = setup;
    moment.deps = deps;
  },
}));

const stopAt = (index: number) => JOURNEY_STOPS[index] as JourneyStopCopy;

const tree = (index: number, live = false) => (
  <MemoryRouter>
    <JourneyStop index={index} live={live} stop={stopAt(index)} total={JOURNEY_STOPS.length} />
  </MemoryRouter>
);

/** A GSAP stand-in that records what the stop asks for. */
const fakeKit = () => {
  const triggers: Record<string, unknown>[] = [];
  const timeline = () => {
    const tl = {
      fromTo: vi.fn(() => tl),
      set: vi.fn(() => tl),
      add: vi.fn(() => tl),
      timeScale: vi.fn(() => tl),
      duration: vi.fn(() => 2.4),
      eventCallback: vi.fn(() => tl),
      play: vi.fn(() => tl),
      reverse: vi.fn(() => tl),
      progress: vi.fn((..._args: unknown[]): unknown => tl),
      pause: vi.fn(() => tl),
    };
    return tl;
  };
  const timelines: ReturnType<typeof timeline>[] = [];
  const leave = {
    play: vi.fn(),
    reverse: vi.fn(),
    progress: vi.fn((..._args: unknown[]): unknown => 0),
    pause: vi.fn(),
  };
  const kit = {
    gsap: {
      timeline: vi.fn(() => {
        const tl = timeline();
        timelines.push(tl);
        return tl;
      }),
      fromTo: vi.fn(() => leave),
      set: vi.fn(),
      delayedCall: vi.fn(() => ({ kill: vi.fn() })),
    },
    ScrollTrigger: {
      create: vi.fn((config: Record<string, unknown>) => triggers.push(config)),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  } as unknown as GsapKit;
  return { kit, triggers, timelines, leave };
};

const runSetup = (
  index: number,
  live: boolean,
  neighbours = false,
  beforeSetup?: (parts: { root: HTMLElement; prev: HTMLElement; next: HTMLElement }) => void,
) => {
  const { container } = render(tree(index, live));
  const root = container.querySelector("section") as HTMLElement;
  // Stand-ins for the stops either side, as the journey renders them.
  const prev = document.createElement("section");
  const next = document.createElement("section");
  if (neighbours) {
    prev.setAttribute("data-journey-stop", "");
    next.setAttribute("data-journey-stop", "");
    root.before(prev);
    root.after(next);
  }
  beforeSetup?.({ root, prev, next });
  const fake = fakeKit();
  const cleanup = (moment.setup as Setup)(fake.kit, root);
  return { ...fake, root, cleanup, prev, next };
};

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("JourneyStop", () => {
  it("is a section labelled by its h2, marked for the page's stop control", () => {
    renderToString(tree(1));
    const { container } = render(tree(1));
    const section = screen.getByRole("region", { name: "Budget and breathing room" });
    expect(section).toBe(container.querySelector("section"));
    expect(section.id).toBe("journey-stop-budget");
    expect(section.getAttribute("data-home-section")).toBe("");
    expect(section.getAttribute("data-home-section-name")).toBe("Budget");
    expect(section.getAttribute("data-home-section-line")).toBe("0.02");
    expect(within(section).getByRole("heading", { level: 2 }).textContent).toBe(
      "Budget and breathing room",
    );
  });

  it("shows 'N of 6' in tabular figures beside a decorative orb dot", () => {
    const { container } = render(tree(2));
    const kicker = container.querySelector("[data-stop-kicker]");
    expect(kicker?.textContent).toBe("3 of 6");
    expect(kicker?.querySelector("[data-orb-dot]")?.getAttribute("aria-hidden")).toBe("true");
    expect(kicker?.querySelector("[data-orb-dot]")?.getAttribute("data-orb-dot")).toBe("violet");
  });

  it("marks the debt stop's kicker violet as prototype 11, never rose, and keeps its travelling orb sky (ruling B)", () => {
    const { container } = render(tree(4));
    expect(container.querySelector("[data-orb-dot]")?.getAttribute("data-orb-dot")).toBe("violet");
    expect(stopAt(4).orbTones).toEqual(["sky", "teal"]);
  });

  it("shows the lead, the fact and the area link", () => {
    render(tree(1));
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

  it("ends the journey on the page's two calls to action", () => {
    render(tree(5));
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(["Request an invite", "Interactive preview"]);
    expect(links[1]?.getAttribute("href")).toBe("/preview");
  });

  it("puts the text before the sample in the HTML, the sample swapping sides each stop", () => {
    const { container } = render(tree(1));
    const sides = Array.from(container.querySelectorAll("[data-stop-side]"));
    expect(sides.map((el) => el.getAttribute("data-stop-side"))).toEqual(["text", "sample"]);
    expect(container.querySelector("section")?.getAttribute("data-card-side")).toBe("left");
    render(tree(2));
    expect(document.querySelectorAll("section")[1]?.getAttribute("data-card-side")).toBe("right");
  });

  it("sets up no changeover until the journey is live", () => {
    const { triggers, kit } = runSetup(1, false);
    expect(triggers).toHaveLength(0);
    expect(kit.gsap.timeline).not.toHaveBeenCalled();
    expect(moment.deps).toEqual([false, 1, 6]);
  });

  it("live, hides the pair by opacity until scroll brings its turn, then plays it on time", () => {
    const { triggers, timelines, kit } = runSetup(1, true);
    // The pair's arrive: both sides from hidden by opacity, taking no pointer, links still in the
    // Tab order.
    const [pairTl] = timelines;
    expect(pairTl?.fromTo.mock.calls[0]?.[1]).toEqual({ y: 24, opacity: 0, pointerEvents: "none" });
    expect(triggers).toHaveLength(2);
    const [arriveTrigger, leaveTrigger] = triggers;
    // Never scrubbed: scroll only triggers.
    expect(arriveTrigger?.scrub).toBeUndefined();
    expect(leaveTrigger?.scrub).toBeUndefined();
    // Not yet at the header: it plays on time.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 400,
      bottom: 900,
    } as DOMRect);
    (arriveTrigger as { onEnter: () => void }).onEnter();
    const arrive = timelines[1];
    expect(arrive?.play).toHaveBeenCalledTimes(1);
    expect(arrive?.progress).not.toHaveBeenCalled();
    (arriveTrigger as { onLeaveBack: () => void }).onLeaveBack();
    expect(arrive?.reverse).toHaveBeenCalledTimes(1);
    expect(kit.gsap.fromTo).toHaveBeenCalledTimes(1);
  });

  it("shows a stop reached by a jump finished at once, its section top already at the header", () => {
    const { triggers, timelines } = runSetup(2, true);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 900,
    } as DOMRect);
    (triggers[0] as { onEnter: () => void }).onEnter();
    expect(timelines[1]?.progress).toHaveBeenCalledWith(1);
    expect(timelines[1]?.play).not.toHaveBeenCalled();
  });

  it("sent STOP_ARRIVE_EVENT by the stop control, shows finished at once: arrived, not left", () => {
    const { root, timelines, leave } = runSetup(2, true, true);
    root.dispatchEvent(new CustomEvent(STOP_ARRIVE_EVENT));
    const arrive = timelines[1];
    expect(arrive?.progress).toHaveBeenCalledWith(1);
    expect(arrive?.play).not.toHaveBeenCalled();
    expect(leave.pause).toHaveBeenCalledWith(0);
  });

  it("goes at once when the next stop is shown, and hides at once when the previous one is", () => {
    const { prev, next, timelines, leave } = runSetup(2, true, true);
    next.dispatchEvent(new CustomEvent(STOP_ARRIVE_EVENT));
    expect(leave.progress).toHaveBeenCalledWith(1);
    prev.dispatchEvent(new CustomEvent(STOP_ARRIVE_EVENT));
    const arrive = timelines[1];
    expect(arrive?.pause).toHaveBeenCalled();
    expect(arrive?.progress).toHaveBeenLastCalledWith(0);
  });

  it("when a link in a pair still to come takes focus, shows it finished and scrolls it to rest", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const { root, timelines, prev } = runSetup(2, true, true);
    const previousGoes = vi.fn();
    prev.addEventListener(STOP_ARRIVE_EVENT, previousGoes);
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({ top: 700 } as DOMRect);
    const arrive = timelines[1];
    // Not yet arrived.
    arrive?.progress.mockReturnValue(0);
    const shown = vi.fn();
    root.addEventListener(STOP_ARRIVE_EVENT, shown);
    root.querySelector("a")?.focus();
    expect(shown).toHaveBeenCalledTimes(1);
    expect(arrive?.progress).toHaveBeenCalledWith(1);
    // scrollY 0 and no header: its section top.
    expect(scrollTo).toHaveBeenCalledWith({ top: 700, behavior: "auto" });
    vi.unstubAllGlobals();
  });

  it("starts finished when it already holds focus as its motion is set up", () => {
    const { timelines, leave } = runSetup(2, true, true, ({ root }) => {
      root.querySelector("a")?.focus();
    });
    expect(timelines[1]?.progress).toHaveBeenCalledWith(1);
    // Its own pair is not sent away.
    expect(leave.progress).not.toHaveBeenCalledWith(1);
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it("starts hidden, waiting for its turn, when focus is elsewhere as its motion is set up", () => {
    const { timelines, leave } = runSetup(2, true, true, ({ prev }) => {
      prev.tabIndex = -1;
      prev.focus();
    });
    expect(timelines[1]?.progress).not.toHaveBeenCalled();
    expect(leave.progress).not.toHaveBeenCalled();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it("has gone at once when the next stop already holds focus as its motion is set up", () => {
    const { timelines, leave } = runSetup(2, true, true, ({ next }) => {
      next.tabIndex = -1;
      next.focus();
    });
    expect(leave.progress).toHaveBeenCalledWith(1);
    expect(timelines[1]?.progress).not.toHaveBeenCalled();
    (document.activeElement as HTMLElement | null)?.blur();
  });

  it("leaves focus alone in a stop already shown, and stops listening once torn down", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const { root, timelines, cleanup, leave } = runSetup(2, true, true);
    timelines[1]?.progress.mockReturnValue(1);
    root.querySelector("a")?.focus();
    expect(scrollTo).not.toHaveBeenCalled();
    (document.activeElement as HTMLElement | null)?.blur();
    cleanup?.();
    root.dispatchEvent(new CustomEvent(STOP_ARRIVE_EVENT));
    expect(leave.pause).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("lets the last pair stay: no leave, and the empty foot of its frame trimmed", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const bottom = this.hasAttribute("data-stop-frame") ? 1000 : 600;
      return { top: 0, bottom } as DOMRect;
    });
    const { triggers, root, cleanup, kit } = runSetup(5, true);
    expect(triggers).toHaveLength(1);
    expect(kit.gsap.fromTo).not.toHaveBeenCalled();
    // 1000 − 600 = 400 empty, less 56 kept = 344
    expect(root.style.marginBottom).toBe("-344px");
    cleanup?.();
    expect(root.style.marginBottom).toBe("");
  });
});
