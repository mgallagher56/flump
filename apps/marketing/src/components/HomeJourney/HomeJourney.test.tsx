import { act, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { HomeJourney } from "./HomeJourney";

const loaders = vi.hoisted(() => ({ scene: vi.fn(), gsap: vi.fn(), painted: vi.fn() }));
vi.mock("../../motion/journey/loadJourneyScene", () => ({ loadJourneyScene: loaders.scene }));
vi.mock("../../motion/loadGsapKit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../motion/loadGsapKit")>()),
  loadGsapKit: loaders.gsap,
  afterFirstPaint: loaders.painted,
}));

const page = (
  <MemoryRouter>
    <AmbientMotionProvider>
      <HomeJourney />
    </AmbientMotionProvider>
  </MemoryRouter>
);

const TITLES = [
  "Accounts and net worth",
  "Budget and breathing room",
  "Take-home pay and Self Assessment",
  "Savings and pension",
  "Debt and borrowing",
  "Where you stand, on one page",
];

/** Parses server HTML the way a browser with JavaScript off would show it. */
const serverDom = () => {
  const host = document.createElement("div");
  host.innerHTML = renderToString(page);
  return host;
};

class OnScreenObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  disconnect() {}
  unobserve() {}
}

const setReducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", OnScreenObserver);
  // GSAP never resolves here, so no moment is set up; the journey's own live switch is tested.
  loaders.gsap.mockReturnValue(new Promise(() => {}));
  loaders.painted.mockReturnValue(Promise.resolve());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("HomeJourney", () => {
  it("is, without JavaScript, a plain list of the six stops in reading order with every stop's text and sample", () => {
    const host = serverDom();
    const journey = host.querySelector("#journey");
    expect(journey?.getAttribute("data-live")).toBe("off");
    expect(journey?.querySelector("h2")?.textContent).toBe("From rough figures to one picture");
    const stops = Array.from(host.querySelectorAll("section[data-journey-stop]"));
    expect(stops.map((el) => el.getAttribute("data-stop-key"))).toEqual([
      "accounts",
      "budget",
      "pay",
      "savings-and-pension",
      "debt-and-borrowing",
      "picture",
    ]);
    expect(stops.map((el) => el.querySelector("h2")?.textContent)).toEqual(TITLES);
    expect(
      stops.map((el) => el.querySelector("[data-sample]")?.getAttribute("data-sample")),
    ).toEqual(["accounts", "budget", "pay", "savings", "debt", "picture"]);
    // Finished and still: no inline style at all in the server render.
    expect(host.innerHTML).not.toMatch(/style="/);
  });

  it("marks each stop for the page's stop control, labelled by its heading", () => {
    const host = serverDom();
    const stops = Array.from(host.querySelectorAll("[data-home-section]"));
    expect(stops.map((el) => el.getAttribute("data-home-section-name"))).toEqual([
      "Accounts",
      "Budget",
      "Pay",
      "Savings",
      "Debt",
      "The picture",
    ]);
    for (const stop of stops) {
      const label = stop.getAttribute("aria-labelledby");
      expect(stop.querySelector(`h2#${label}`)).not.toBeNull();
      expect(stop.id).toMatch(/^journey-stop-/);
    }
  });

  it("counts the stops as 'N of 6' and ends on the page's two calls to action", () => {
    const host = serverDom();
    const kickers = Array.from(host.querySelectorAll("[data-stop-kicker]"));
    expect(kickers.map((p) => p.textContent)).toEqual([
      "1 of 6",
      "2 of 6",
      "3 of 6",
      "4 of 6",
      "5 of 6",
      "6 of 6",
    ]);
    const links = Array.from(host.querySelectorAll('[data-stop-key="picture"] a'));
    expect(links.map((a) => a.textContent)).toEqual(["Request an invite", "Interactive preview"]);
    expect(links[1]?.getAttribute("href")).toBe("/preview");
  });

  it("puts the scene in an aria-hidden stage, still in the server render, with the pause control in the intro", () => {
    const host = serverDom();
    const stage = host.querySelector('[data-testid="journey-stage"]');
    expect(stage?.getAttribute("aria-hidden")).toBe("true");
    expect(stage?.getAttribute("data-scene")).toBe("still");
    expect(stage?.querySelector("canvas")).toBeNull();
    expect(
      Array.from(stage?.querySelectorAll("[data-glass-orb]") ?? []).map((orb) =>
        orb.getAttribute("data-orb-tone"),
      ),
    ).toEqual(["sky", "violet", "teal", "rose"]);
    expect(host.querySelector("[data-journey-intro] [data-motion-control]")).not.toBeNull();
    expect(
      host.querySelector("[data-journey-scrim]")?.closest("[aria-hidden=true]"),
    ).not.toBeNull();
  });

  it("never loads three.js or GSAP under reduced motion, and shows the complete still list", async () => {
    setReducedMotion(true);
    render(page);
    await act(async () => {});
    expect(loaders.scene).not.toHaveBeenCalled();
    expect(loaders.gsap).not.toHaveBeenCalled();
    const journey = screen.getByTestId("home-journey");
    expect(journey.getAttribute("data-live")).toBe("off");
    expect(screen.getByTestId("journey-stage").getAttribute("data-scene")).toBe("still");
    expect(screen.getByTestId("journey-stage").getAttribute("data-still-reason")).toBe(
      "reduced-motion",
    );
    expect(
      within(journey)
        .getAllByRole("heading", { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(["From rough figures to one picture", ...TITLES]);
  });

  it("never asks for GSAP when reduced motion arrives before first paint", async () => {
    setReducedMotion(false);
    // No band comes on screen, so only the journey's own live switch could ask for GSAP.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    loaders.gsap.mockClear();
    let paint: () => void = () => {};
    loaders.painted.mockReturnValue(
      new Promise<void>((resolve) => {
        paint = resolve;
      }),
    );
    const { rerender } = render(page);
    expect(loaders.painted).toHaveBeenCalled();
    // The visitor's reduced motion is read after the first render (hydration reads the server's).
    setReducedMotion(true);
    rerender(<div key="reset">{page}</div>);
    await act(async () => {
      paint();
    });
    expect(loaders.gsap).not.toHaveBeenCalled();
  });

  it("goes live once GSAP has loaded with motion allowed", async () => {
    setReducedMotion(false);
    let loaded: (value: unknown) => void = () => {};
    loaders.gsap.mockReturnValue(
      new Promise((resolve) => {
        loaded = resolve;
      }),
    );
    render(page);
    const journey = screen.getByTestId("home-journey");
    expect(journey.getAttribute("data-live")).toBe("off");
    // A kit that sets nothing up: the stops' moments may be queued before this test unmounts, and an
    // empty object made a queued set-up throw on `kit.gsap` after the test had passed (an
    // unhandled error that failed the run now and then).
    const kit = {
      gsap: { context: () => ({ revert: () => {} }) },
      ScrollTrigger: { refresh: () => {} },
    };
    await act(async () => {
      loaded(kit);
    });
    expect(journey.getAttribute("data-live")).toBe("on");
  });
});
