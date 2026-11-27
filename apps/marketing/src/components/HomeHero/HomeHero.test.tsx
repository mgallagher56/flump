import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import type { GsapKit } from "../../motion/loadGsapKit";
import { signupCta } from "../../utils/site";
import { HomeHero } from "./HomeHero";
import { ASSEMBLY_UNITS, armHeroAssembly, FLIGHTS_START } from "./heroAssembly";
import { HERO_FIGURES, HERO_SOURCES } from "./heroData";

const renderHero = () =>
  render(
    <AmbientMotionProvider>
      <HomeHero />
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
    expect(document.querySelector("[data-motion-control] button")).not.toBeNull();
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

  it("server-renders the finished, still picture: no inline styles and no live flag", () => {
    const html = renderToString(
      <AmbientMotionProvider>
        <HomeHero />
      </AmbientMotionProvider>,
    );
    expect(html).not.toContain("style=");
    expect(html).not.toMatch(/ data-hero-live="/);
    expect(html).not.toMatch(/ data-enhanced="/);
    expect(html).toContain(HERO_FIGURES.netWorth);
    expect(html).toContain('data-testid="home-hero"');
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
  const gsap = {
    timeline: vi.fn(() => timeline),
    set: vi.fn(),
    context: vi.fn((fn: () => void) => {
      fn();
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
    const { report } = stubObserver();
    const { kit, gsap, timeline, revert } = fakeKit();
    const root = mountHero();
    const finish = armHeroAssembly(kit, root);
    report({ isIntersecting: true, ratio: 0.1, bottom: 900 });
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    expect(root.dataset.heroLive).toBe("true");
    expect(timeline.play).toHaveBeenCalledTimes(1);
    // Six pieces scattered, each centred on its own middle.
    expect(gsap.set).toHaveBeenCalledTimes(6);
    expect(gsap.set.mock.calls[0]?.[1]).toMatchObject({ xPercent: -50, yPercent: -50, opacity: 0 });
    // The run is time-based: no scroll trigger, no scrub, no reverse.
    for (const call of timeline.to.mock.calls) {
      expect(call[1]).not.toHaveProperty("scrollTrigger");
      expect(call[1]).not.toHaveProperty("scrub");
    }
    finish();
    expect(revert).toHaveBeenCalledTimes(1);
    expect(timeline.kill).toHaveBeenCalledTimes(1);
    expect(root.dataset.heroLive).toBeUndefined();
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
