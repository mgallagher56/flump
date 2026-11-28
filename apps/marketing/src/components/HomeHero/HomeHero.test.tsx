import { SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import { act, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { StillMotionProvider } from "../../context/StillMotionContext";
import type { GsapKit } from "../../motion/loadGsapKit";
import { signupCta } from "../../utils/site";
import { HomeHero as Hero, heroModeFrom } from "./HomeHero";
import { ASSEMBLY_UNITS, armHeroAssembly, FLIGHTS_START } from "./heroAssembly";
import { HERO_BUBBLE_DENSITY, HERO_BUBBLES } from "./heroBubbles";
import { HERO_FIGURES, HERO_SOURCES, heroFiguresFor } from "./heroData";
import {
  ASSEMBLE_S,
  armHeroScroll,
  FOLLOW_S,
  INTRO_DELAY_S,
  PART_S,
  PIN_SCREENS,
  placeAfterPin,
  TOTAL,
} from "./heroScroll";
import { SCATTER, startPlace, startVars, TRAY } from "./heroStart";

const renderHero = () =>
  render(
    <AmbientMotionProvider>
      <Hero />
    </AmbientMotionProvider>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("HomeHero", () => {
  it("is the labelled hero with the decided heading, lead and two calls to action", () => {
    renderHero();
    const section = screen.getByTestId("home-hero");
    expect(section.tagName).toBe("SECTION");
    expect(section.getAttribute("aria-labelledby")).toBe("home-title");
    expect(
      screen.getByRole("heading", { level: 1, name: "All your money. One clear picture." }).id,
    ).toBe("home-title");
    expect(
      screen.getByText("Accounts, budget, pay, savings, pension and debts in one place."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Request an invite" }).getAttribute("href")).toBe(
      signupCta().href,
    );
    expect(screen.getByRole("link", { name: "Interactive preview" }).getAttribute("href")).toBe(
      "/preview",
    );
    expect(screen.getByRole("link", { name: "See the five areas" }).getAttribute("href")).toBe(
      "#features",
    );
    // Every call to action in the hero carries prototype 11's pointer light.
    for (const name of ["Request an invite", "Interactive preview"]) {
      expect(screen.getByRole("link", { name }).hasAttribute("data-light")).toBe(true);
    }
    // The pause control moved beside the section control (HomeStopControl on the home page).
    expect(section.getAttribute("data-home-section-name")).toBe("One picture");
    expect(section.id).toBe("home-hero");
  });

  it("fades the scroll cue once the page has scrolled past 60px, and back at the top", () => {
    renderHero();
    const cue = screen.getByTestId("hero-scroll-cue");
    expect(cue.getAttribute("data-scrolled")).toBe("false");
    act(() => {
      vi.spyOn(window, "scrollY", "get").mockReturnValue(61);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(cue.getAttribute("data-scrolled")).toBe("true");
    act(() => {
      vi.spyOn(window, "scrollY", "get").mockReturnValue(60);
      window.dispatchEvent(new Event("scroll"));
    });
    expect(cue.getAttribute("data-scrolled")).toBe("false");
  });

  it("names the dashboard 'Monthly picture Example' and shows every figure at its final value", () => {
    renderHero();
    const dash = screen.getByRole("figure", { name: "Monthly picture Example" });
    expect(within(dash).getByText(HERO_FIGURES.netWorth)).toBeDefined();
    if (HERO_FIGURES.leftOverMonthly !== null) {
      expect(within(dash).getAllByText(HERO_FIGURES.leftOverMonthly).length).toBeGreaterThan(0);
    }
    const rows = within(dash).getAllByRole("listitem");
    expect(rows.map((row) => row.getAttribute("data-hero-row"))).toEqual([
      "card",
      "pension",
      "payslip",
      "receipt",
      "statement",
      "credit",
    ]);
    expect(rows[0]?.textContent).toContain("Cash and savings");
    expect(rows[0]?.textContent).toContain(HERO_FIGURES.savings);
    expect(rows[4]?.textContent).toContain(`fixed until ${HERO_FIGURES.fixedUntil}`);
  });

  it("formats sample figures in en-GB pounds with no pence", () => {
    expect(HERO_FIGURES.netWorth).toMatch(/^-?£\d{1,3}(,\d{3})*$/);
    expect(HERO_FIGURES.savingsRate).toMatch(/^\d+(\.\d+)?% AER$/);
    expect(HERO_SOURCES).toHaveLength(6);
  });

  it("keeps the pieces in one aria-hidden layer, out of the accessible tree", () => {
    const { container } = renderHero();
    const pieces = container.querySelectorAll("[data-hero-piece]");
    expect(pieces).toHaveLength(6);
    const layer = pieces[0]?.parentElement;
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    for (const p of pieces) expect(p.parentElement).toBe(layer);
    // Only the dashboard's own "Example" tag is in the accessible tree.
    expect(
      screen.getAllByText("Example").filter((el) => !el.closest("[aria-hidden]")),
    ).toHaveLength(1);
  });

  it("server-renders every figure and the start state's places, as custom properties only", () => {
    const html = renderToString(
      <AmbientMotionProvider>
        <Hero />
      </AmbientMotionProvider>,
    );
    // The CSS draws the start state from these: each piece's place, and each bubble's. No inline
    // style sets anything else, so nothing is drawn by the server but through the CSS.
    const styles = [...html.matchAll(/ style="([^"]*)"/g)].map((m) => m[1] ?? "");
    expect(styles).toHaveLength(6 + HERO_BUBBLES[HERO_BUBBLE_DENSITY].length);
    for (const style of styles) {
      for (const declaration of style.split(";").filter(Boolean)) {
        expect(declaration.trim()).toMatch(/^--[a-z-]+:/);
      }
    }
    expect(html).not.toMatch(/ data-hero-(live|ready|done)="/);
    expect(html).not.toMatch(/ data-enhanced="/);
    expect(html).toContain(HERO_FIGURES.netWorth);
    expect(html).toContain('data-testid="home-hero"');
  });

  it("gives each piece its start place from the one table the assembly reads", () => {
    const { container } = renderHero();
    const card = container.querySelector<HTMLElement>('[data-hero-piece="card"]');
    expect(card?.style.getPropertyValue("--scatter-x")).toBe(String(SCATTER.card.x));
    expect(card?.style.getPropertyValue("--scatter-z")).toBe(String(SCATTER.card.z));
    expect(card?.style.getPropertyValue("--tray-bottom")).toBe(`${TRAY.card.bottom}rem`);
    expect(card?.style.getPropertyValue("--tray-scale")).toBe(String(TRAY.card.scale));
  });

  it("marks a still page (a story's rest state) done, so it shows the finished picture", () => {
    render(
      <StillMotionProvider>
        <AmbientMotionProvider>
          <Hero />
        </AmbientMotionProvider>
      </StillMotionProvider>,
    );
    expect(screen.getByTestId("home-hero").dataset.heroDone).toBe("true");
  });
});

describe("heroStart", () => {
  it("places a piece in depth from 1024px, by shares of the stage, as the CSS does", () => {
    expect(startPlace("card", { width: 640, height: 700 }, true, 16)).toEqual({
      xPercent: -50,
      yPercent: -50,
      x: -0.26 * 640,
      y: -0.29 * 700,
      z: 60,
      rotationX: 5,
      rotationY: -6,
      rotationZ: -4,
      scale: 1,
      opacity: 1,
    });
  });

  it("places a piece in the tray under 1024px: a quarter of the stage less 7px from its middle", () => {
    // 25cqw − 7px across; 50cqh − 21rem down; 0.55 of its size (HomeHero.styles.ts `piece`).
    expect(startPlace("card", { width: 358, height: 840 }, false, 16)).toMatchObject({
      x: -(358 / 4 - 7),
      y: 840 / 2 - 21 * 16,
      scale: 0.55,
      rotationX: 0,
      z: 0,
    });
    expect(startPlace("credit", { width: 358, height: 840 }, false, 16)).toMatchObject({
      x: 358 / 4 - 7,
      y: 840 / 2 - 8 * 16,
    });
  });

  it("writes every piece's custom properties for the CSS", () => {
    expect(startVars("receipt")).toEqual({
      "--scatter-x": -0.24,
      "--scatter-y": 0.02,
      "--scatter-z": 80,
      "--scatter-rx": -3,
      "--scatter-ry": 4,
      "--scatter-rz": -2,
      "--tray-col": 1,
      "--tray-bottom": "14.5rem",
      "--tray-scale": 0.6,
    });
  });
});

describe("hero bubbles", () => {
  const wide = (d: keyof typeof HERO_BUBBLES) =>
    HERO_BUBBLES[d].filter((s) => s.show === "wide").length;

  it("offers three densities, each adding to the last, and the page uses medium", () => {
    // Prototype 11 had two in the two columns; light adds about three, medium five, fuller eight.
    expect([wide("light"), wide("medium"), wide("fuller")]).toEqual([5, 7, 10]);
    expect(HERO_BUBBLES.medium.slice(0, HERO_BUBBLES.light.length)).toEqual(HERO_BUBBLES.light);
    expect(HERO_BUBBLE_DENSITY).toBe("medium");
  });

  it("draws them in the orb sets only, as still bubbles in the hero's field", () => {
    const { container } = renderHero();
    const field = container.querySelector("[data-bubble-field]");
    expect(field?.getAttribute("aria-hidden")).toBe("true");
    // In the column the pin holds, so the pin moves none of them.
    expect(field?.parentElement?.hasAttribute("data-hero-inner")).toBe(true);
    const sets = Array.from(field?.querySelectorAll("[data-bubble-set]") ?? []).map((b) =>
      b.getAttribute("data-bubble-set"),
    );
    expect(sets).toHaveLength(HERO_BUBBLES.medium.length);
    expect(new Set(sets)).toEqual(new Set(["skyTeal", "violetRose"]));
  });
});

/** A stand-in for GSAP that records what the assembly asks of it. */
function fakeKit() {
  const timeline = {
    to: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    play: vi.fn(),
    kill: vi.fn(),
    progress: vi.fn().mockReturnValue(0),
  };
  const revert = vi.fn();
  /** Whether the timeline was made inside a `gsap.context`, so reverting it reverts the timeline. */
  const made = { inContext: false, insideNow: false };
  const gsap = {
    timeline: vi.fn(() => {
      made.inContext = made.insideNow;
      return timeline;
    }),
    set: vi.fn(),
    context: vi.fn((fn: () => void) => {
      made.insideNow = true;
      fn();
      made.insideNow = false;
      return { revert };
    }),
    utils: { clamp: (min: number, max: number, v: number) => Math.min(max, Math.max(min, v)) },
  };
  return { kit: { gsap } as unknown as GsapKit, gsap, timeline, revert };
}

/** Stubs IntersectionObserver so the test decides where the stage is. */
function stubObserver() {
  let callback: IntersectionObserverCallback = () => undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  const report = (entry: { isIntersecting: boolean; ratio: number; bottom: number }) =>
    callback(
      [
        {
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.ratio,
          boundingClientRect: { bottom: entry.bottom } as DOMRectReadOnly,
          rootBounds: { top: 0 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  return { report, disconnect };
}

describe("heroAssembly", () => {
  const mountHero = () => renderHero().getByTestId("home-hero");

  it("ends the run on its last figure, after the flights begin", () => {
    expect(ASSEMBLY_UNITS).toBeCloseTo(7.9);
    expect(FLIGHTS_START).toBe(0.8);
  });

  it("plays at once, forward, when the stage is in view, and hands back the finished picture", () => {
    stubWidth(true);
    const { report } = stubObserver();
    const { kit, gsap, timeline, revert } = fakeKit();
    const root = mountHero();
    const finish = armHeroAssembly(kit, root);
    report({ isIntersecting: true, ratio: 0.1, bottom: 900 });
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    expect(root.dataset.heroLive).toBe("true");
    expect(timeline.play).toHaveBeenCalledTimes(1);
    // It starts from the server render's start state: six pieces already shown where they float,
    // each centred on its own middle, and the dashboard pushed back under them.
    const pieces = gsap.set.mock.calls.filter((c) =>
      (c[0] as Element)?.hasAttribute?.("data-hero-piece"),
    );
    expect(pieces).toHaveLength(6);
    expect(pieces[0]?.[1]).toMatchObject({ xPercent: -50, yPercent: -50, z: 60, opacity: 1 });
    const dash = root.querySelector("[data-hero-dash]");
    expect(gsap.set.mock.calls.find((c) => c[0] === dash)?.[1]).toMatchObject({ z: -120 });
    // The run is time-based: no scroll trigger, no scrub, no reverse.
    for (const call of timeline.to.mock.calls) {
      expect(call[1]).not.toHaveProperty("scrollTrigger");
      expect(call[1]).not.toHaveProperty("scrub");
    }
    finish();
    expect(revert).toHaveBeenCalledTimes(1);
    expect(timeline.kill).toHaveBeenCalledTimes(1);
    expect(root.dataset.heroLive).toBeUndefined();
    // Done: the CSS start state stays off, so the finished picture stays.
    expect(root.dataset.heroDone).toBe("true");
  });

  it("never plays when the page loads with the hero scrolled past", () => {
    const { report, disconnect } = stubObserver();
    const { kit, gsap, timeline } = fakeKit();
    const root = mountHero();
    armHeroAssembly(kit, root);
    report({ isIntersecting: false, ratio: 0, bottom: -40 });
    expect(gsap.timeline).not.toHaveBeenCalled();
    expect(timeline.play).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(root.dataset.heroLive).toBeUndefined();
  });

  it("waits below the fold where the flights begin, then plays once a quarter is in view", () => {
    const { report } = stubObserver();
    const { kit, timeline } = fakeKit();
    timeline.progress.mockReturnValue(FLIGHTS_START / ASSEMBLY_UNITS);
    const root = mountHero();
    armHeroAssembly(kit, root);
    report({ isIntersecting: false, ratio: 0, bottom: 1600 });
    expect(timeline.progress).toHaveBeenCalledWith(FLIGHTS_START / ASSEMBLY_UNITS);
    expect(timeline.play).not.toHaveBeenCalled();
    report({ isIntersecting: true, ratio: 0.1, bottom: 1200 });
    expect(timeline.play).not.toHaveBeenCalled();
    report({ isIntersecting: true, ratio: 0.3, bottom: 1000 });
    expect(timeline.play).toHaveBeenCalledTimes(1);
  });

  it("shows the finished picture when the width changes mid-run", () => {
    const { report } = stubObserver();
    const { kit, revert } = fakeKit();
    const root = mountHero();
    armHeroAssembly(kit, root);
    report({ isIntersecting: true, ratio: 0.5, bottom: 900 });
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(window.innerWidth + 200);
    window.dispatchEvent(new Event("resize"));
    expect(revert).toHaveBeenCalledTimes(1);
    expect(root.dataset.heroLive).toBeUndefined();
  });
});

describe("hero mode", () => {
  it("is prototype 11's scroll version unless the address asks for the timed one", () => {
    expect(heroModeFrom("")).toBe("scroll");
    expect(heroModeFrom("?hero=scroll")).toBe("scroll");
    expect(heroModeFrom("?hero=timed")).toBe("timed");
    expect(heroModeFrom("?utm=x&hero=timed")).toBe("timed");
    expect(heroModeFrom("?hero=TIMED")).toBe("scroll");
  });
});

/** A stand-in for GSAP with ScrollTrigger, recording what the scroll version asks of it. */
function fakeScrollKit() {
  const timeline = {
    to: vi.fn().mockReturnThis(),
    progress: vi.fn().mockReturnValue(1),
  };
  const revert = vi.fn();
  const triggers: Record<string, unknown>[] = [];
  const created = {
    isActive: false,
    progress: 0,
    start: 400,
  };
  /** Whether the timeline was made inside a `gsap.context`, so reverting it reverts the timeline. */
  const made = { inContext: false, insideNow: false };
  const gsap = {
    timeline: vi.fn(() => {
      made.inContext = made.insideNow;
      return timeline;
    }),
    set: vi.fn(),
    to: vi.fn(() => ({ kill: vi.fn() })),
    quickTo: vi.fn(() => vi.fn()),
    context: vi.fn((fn: () => void) => {
      made.insideNow = true;
      fn();
      made.insideNow = false;
      return { revert };
    }),
    utils: { clamp: (min: number, max: number, v: number) => Math.min(max, Math.max(min, v)) },
  };
  const ScrollTrigger = {
    create: vi.fn((vars: Record<string, unknown>) => {
      triggers.push(vars);
      return created;
    }),
    sort: vi.fn(),
    refresh: vi.fn(),
  };
  // Flip.fit's landing for the lifted "left over" figure.
  const Flip = { fit: vi.fn(() => ({ x: 40, y: -30, scaleX: 1.2, scaleY: 1.5 })) };
  return {
    kit: { gsap, ScrollTrigger, Flip } as unknown as GsapKit,
    gsap,
    timeline,
    triggers,
    revert,
    Flip,
    made,
  };
}

const stubWidth = (wide: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width: 1024px") ? wide : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

describe("heroScroll (prototype 11's version)", () => {
  it("lifts the receipt's left over figure onto the tile's figure, then sweeps one light across", () => {
    stubWidth(true);
    const { kit, gsap, timeline, Flip } = fakeScrollKit();
    const root = renderHero().getByTestId("home-hero");
    armHeroScroll(kit, root);
    const ghost = root.querySelector("[data-hero-ghost]");
    const glint = root.querySelector("[data-hero-glint]");
    expect(ghost?.textContent).toBe(HERO_FIGURES.leftOver);
    expect(Flip.fit).toHaveBeenCalledWith(
      ghost,
      root.querySelector('[data-hero-value="left"]'),
      expect.objectContaining({ getVars: true, scale: true }),
    );
    const ghostSet = gsap.set.mock.calls.find((c) => c[0] === ghost);
    expect(ghostSet?.[1]).toMatchObject({ opacity: 0, scale: 1 });
    const on = (el: Element | null) =>
      timeline.to.mock.calls.filter((c) => c[0] === el) as [
        unknown,
        Record<string, unknown>,
        number,
      ][];
    const lift = on(ghost);
    // Shown as the receipt leaves at 3.0, flown to Flip's fit over 2.0 at its height's scale
    // (scaleY 1.5 for both axes), gone at 3.0 + 1.95 = 4.95.
    expect(lift.map((c) => c[2])).toEqual([3, 3, 4.95]);
    expect(lift[1]?.[1]).toMatchObject({ x: 40, y: -30, scaleX: 1.5, scaleY: 1.5, duration: 2 });
    expect(lift[2]?.[1]).toMatchObject({ opacity: 0 });
    // The glint starts off the left edge, crosses at 7.7 and fades by 9.0.
    expect(gsap.set.mock.calls.find((c) => c[0] === glint)?.[1]).toEqual({
      xPercent: -120,
      opacity: 0,
    });
    const sweep = on(glint);
    expect(sweep.map((c) => c[2])).toEqual([7.7, 7.7, 9]);
    expect(sweep[1]?.[1]).toMatchObject({ xPercent: 120 });
  });

  it("takes its timings from the hero token: prototype 11's values times its pace of 1.4", () => {
    // durations.marketing.hero is 4,760 ms = 3,400 x 1.4, so 500 ms calm is 0.7 s and so on.
    expect(INTRO_DELAY_S).toBeCloseTo(0.7);
    expect(FOLLOW_S).toBeCloseTo(1.4);
    expect(ASSEMBLE_S).toBeCloseTo(3.36);
    expect(PART_S).toBeCloseTo(2.24);
    // 1.4 screens x 0.4 x 1.4 (the prototype's pace factor, Calm 1 x its scale 1.4) = 0.784
    // screens of pinned scroll: 706 px on a 900 px screen.
    expect(PIN_SCREENS).toBeCloseTo(0.784);
    expect(TOTAL).toBe(10);
  });

  it("from 1024px pins the two columns and has the picture follow the scroll", () => {
    stubWidth(true);
    const { kit, gsap, timeline, triggers, revert } = fakeScrollKit();
    const root = renderHero().getByTestId("home-hero");
    const finish = armHeroScroll(kit, root);
    expect(root.dataset.heroLive).toBe("true");
    // It opens apart, as the server render does, and never shows the assembled picture first: at
    // the top of the page nothing plays until the reader scrolls.
    expect(timeline.progress.mock.calls).toEqual([[0]]);
    expect(gsap.to).not.toHaveBeenCalled();
    expect(triggers).toHaveLength(1);
    const pin = triggers[0] as Record<string, unknown>;
    expect(pin.pin).toBe(root.querySelector("[data-hero-inner]"));
    expect(pin.refreshPriority).toBe(1);
    // Scrolling moves the timeline with a soft lag, never as a jump.
    (pin.onUpdate as (self: { progress: number }) => void)({ progress: 0.5 });
    expect(gsap.to).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ progress: 0.5, duration: FOLLOW_S, ease: "calm" }),
    );
    // The six pieces float apart in depth, centred on their own middles.
    const pieces = gsap.set.mock.calls.filter((c) =>
      (c[0] as Element)?.hasAttribute?.("data-hero-piece"),
    );
    expect(pieces).toHaveLength(6);
    expect(pieces[0]?.[1]).toMatchObject({ xPercent: -50, yPercent: -50, z: 60, opacity: 1 });
    finish();
    expect(revert).toHaveBeenCalled();
    expect(root.dataset.heroLive).toBeUndefined();
    expect(root.dataset.heroReady).toBeUndefined();
  });

  it("keeps the place of a reader already below the hero when its pin is added", () => {
    stubWidth(true);
    const { kit } = fakeScrollKit();
    const root = renderHero().getByTestId("home-hero");
    let pinned = false;
    (kit.ScrollTrigger.refresh as ReturnType<typeof vi.fn>).mockImplementation(() => {
      pinned = true;
    });
    // The hero ends 900px down the page; the pin's run adds 790px to it.
    vi.spyOn(root, "getBoundingClientRect").mockImplementation(
      () => ({ bottom: (pinned ? 1690 : 900) - window.scrollY }) as DOMRect,
    );
    vi.spyOn(window, "scrollY", "get").mockReturnValue(3000);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    armHeroScroll(kit, root);
    // 3000 + 790 = 3790: what the reader was looking at stays put.
    expect(scrollTo).toHaveBeenCalledWith({ top: 3790, behavior: "auto" });
  });

  it("leaves the scroll alone when the reader is still in the hero as it sets up", () => {
    stubWidth(true);
    const { kit } = fakeScrollKit();
    const root = renderHero().getByTestId("home-hero");
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    armHeroScroll(kit, root);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("moves a reader below the hero by what the pin added, and no one else", () => {
    // Below the hero's end (900): moved by 1690 − 900 = 790.
    expect(placeAfterPin(3000, 900, 1690)).toBe(3790);
    // On the edge: the hero ends at the top of the screen.
    expect(placeAfterPin(900, 900, 1690)).toBe(1690);
    // Still in the hero: the pin's own run takes care of it.
    expect(placeAfterPin(899, 900, 1690)).toBeNull();
    // Nothing added (under 1024px there is no pin).
    expect(placeAfterPin(3000, 900, 900)).toBeNull();
  });

  it("makes its run's timeline inside its gsap context, so teardown and a width change revert it", () => {
    stubWidth(true);
    const { kit, gsap, made } = fakeScrollKit();
    const root = renderHero().getByTestId("home-hero");
    armHeroScroll(kit, root);
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    expect(made.inContext).toBe(true);
  });

  it("under 1024px is never pinned or scrubbed: scroll triggers it and time completes it", () => {
    stubWidth(false);
    const { kit, gsap, timeline, triggers } = fakeScrollKit();
    const root = renderHero().getByTestId("home-hero");
    armHeroScroll(kit, root);
    // It opens in the tray, as the server render does: no assembled picture parting first.
    expect(timeline.progress.mock.calls).toEqual([[0]]);
    expect(gsap.to).not.toHaveBeenCalled();
    expect(triggers).toHaveLength(1);
    const trigger = triggers[0] as Record<string, unknown>;
    expect(trigger.pin).toBeUndefined();
    expect(trigger.scrub).toBeUndefined();
    expect(trigger.start).toBe("top 60%");
    (trigger.onEnter as () => void)();
    expect(gsap.to).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ progress: 1, duration: ASSEMBLE_S }),
    );
    (trigger.onLeaveBack as () => void)();
    expect(gsap.to).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ progress: 0, duration: PART_S }),
    );
  });

  it("under 1024px assembles after a pause when the page loads with the stage already past its line", () => {
    stubWidth(false);
    const { kit, gsap, timeline, triggers } = fakeScrollKit();
    timeline.progress.mockReturnValue(0);
    const root = renderHero().getByTestId("home-hero");
    armHeroScroll(kit, root);
    const onRefresh = (triggers[0] as { onRefresh: (self: { start: number }) => void }).onRefresh;
    // A phone: the dashboard's top is already above 60% of the screen at the top of the page.
    onRefresh({ start: -26 });
    expect(gsap.to).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ progress: 1, duration: ASSEMBLE_S, delay: INTRO_DELAY_S }),
    );
    // Only the first refresh decides; later ones (the page growing) leave it alone.
    onRefresh({ start: -26 });
    expect(gsap.to).toHaveBeenCalledTimes(1);
  });

  it("under 1024px waits in the tray when the stage is still below its line", () => {
    stubWidth(false);
    const { kit, gsap, timeline, triggers } = fakeScrollKit();
    timeline.progress.mockReturnValue(0);
    const root = renderHero().getByTestId("home-hero");
    armHeroScroll(kit, root);
    (triggers[0] as { onRefresh: (self: { start: number }) => void }).onRefresh({ start: 400 });
    expect(gsap.to).not.toHaveBeenCalled();
  });
});

describe("heroFiguresFor", () => {
  const renter = SAMPLE_HOUSEHOLDS.renter.fixture;

  it("reads a renter's figures, with £0 or blank for the accounts they do not have", () => {
    expect(heroFiguresFor(renter)).toEqual({
      // Cash ISA £4,200 at 4.1% AER
      savings: "£4,200",
      savingsRate: "4.1% AER",
      // £38,000 / 12 = £3,166.67, shown to the pound: £3,167
      salary: "£38,000",
      grossMonthly: "£3,167",
      netMonthly: "£2,382",
      comesIn: "£2,382",
      // 850 + 120 + 220 + 90 + 150 + 200 = £1,630 out; 2,382 − 1,630 = £752 left
      goesOut: "£1,630",
      leftOver: "£752",
      // No mortgage, pension, card, home or loan: £0, with no rate and no fixed date.
      mortgage: "£0",
      mortgageRate: "",
      fixedUntil: "",
      pension: "£0",
      card: "£0",
      cardRate: " APR",
      cardMonthly: "£0",
      home: "£0",
      loan: "£0",
      // Current £1,850 + ISA £4,200 = £6,050 (the default basis leaves the student loan out)
      netWorth: "£6,050",
      leftOverMonthly: "£752",
      // £6,050 over essentials 850 + 120 + 220 + 90 = £1,280 a month: 4.73, so about 4.7 months
      breathingRoom: "About 4.7 months",
    });
  });

  it("leaves out what the engine cannot know, and reads a year-only fixed date as January", () => {
    const figures = heroFiguresFor({
      ...renter,
      profile: { ...renter.profile, annualSalary: null },
      accounts: [
        { id: "m", name: "Mortgage", type: "Mortgage", balance: 1000, fixedRateEndDate: "2030" },
      ],
      budget: [],
    });
    expect(figures.salary).toBe("£0");
    expect(figures.savingsRate).toBe(" AER");
    expect(figures.mortgage).toBe("£1,000");
    expect(figures.fixedUntil).toBe("January 2030");
    // Only the £1,000 mortgage: −£1,000
    expect(figures.netWorth).toBe("-£1,000");
    expect(figures.leftOverMonthly).toBeNull();
    expect(figures.breathingRoom).toBeNull();
  });
});
