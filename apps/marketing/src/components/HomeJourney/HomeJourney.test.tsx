import { act, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmbientMotionProvider } from "../../context/AmbientMotionContext";
import { HomeJourney } from "./HomeJourney";

const loaders = vi.hoisted(() => ({ scene: vi.fn(), gsap: vi.fn() }));
vi.mock("../../motion/journey/loadJourneyScene", () => ({ loadJourneyScene: loaders.scene }));
vi.mock("../../motion/loadGsapKit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../motion/loadGsapKit")>()),
  loadGsapKit: loaders.gsap,
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("HomeJourney", () => {
  it("is, without JavaScript, a plain list of the six stops in reading order with every stop's text and sample", () => {
    const host = serverDom();
    const section = host.querySelector("section#journey");
    expect(section?.getAttribute("data-tone-band")).toBe("canvas");
    expect(section?.querySelector("h2")?.textContent).toBe("From rough figures to one picture");
    const stops = Array.from(host.querySelectorAll("ol > li[data-journey-stop]"));
    expect(stops.map((li) => li.getAttribute("data-stop-key"))).toEqual([
      "accounts",
      "budget",
      "pay",
      "savings-and-pension",
      "debt-and-borrowing",
      "picture",
    ]);
    expect(stops.map((li) => li.querySelector("h3")?.textContent)).toEqual(TITLES);
    expect(
      stops.map((li) => li.querySelector("[data-sample]")?.getAttribute("data-sample")),
    ).toEqual(["accounts", "budget", "pay", "savings", "debt", "picture"]);
    // Each stop's text comes before its sample in the HTML, whichever side the sample shows on.
    for (const li of stops) {
      const [first, second] = Array.from(li.querySelectorAll("[data-stop-side]"));
      expect(first?.getAttribute("data-stop-side")).toBe("text");
      expect(second?.getAttribute("data-stop-side")).toBe("sample");
    }
    // Finished and still: no inline transform or opacity anywhere in the server render.
    expect(host.innerHTML).not.toMatch(/style="[^"]*(transform|opacity)/);
  });

  it("names stops plainly, with no carousel count, and asks for no invite", () => {
    const host = serverDom();
    const names = Array.from(host.querySelectorAll('[data-stop-side="text"] p:first-child'));
    expect(names.map((p) => p.textContent)).toEqual([
      "Accounts",
      "Budget",
      "Pay",
      "Savings and pension",
      "Debt and borrowing",
      "The picture",
    ]);
    expect(host.textContent).not.toMatch(/\d+ of \d+/);
    expect(host.textContent).not.toContain("Request an invite");
    const last = host.querySelector('[data-stop-key="picture"] a');
    expect(last?.getAttribute("href")).toBe("/preview");
    expect(last?.textContent).toBe("Open the interactive preview");
  });

  it("puts the orb in an aria-hidden rail, still in the server render, beside the pause control", () => {
    const host = serverDom();
    const rail = host.querySelector('[data-testid="journey-orb"]');
    expect(rail?.getAttribute("aria-hidden")).toBe("true");
    expect(rail?.getAttribute("data-scene")).toBe("still");
    expect(rail?.querySelector("canvas")).toBeNull();
    expect(host.querySelector('[data-testid="motion-control"]')).not.toBeNull();
  });

  it("never loads three.js or GSAP under reduced motion, and shows the complete still page", async () => {
    setReducedMotion(true);
    render(page);
    await act(async () => {});
    expect(loaders.scene).not.toHaveBeenCalled();
    expect(loaders.gsap).not.toHaveBeenCalled();
    const rail = screen.getByTestId("journey-orb");
    expect(rail.getAttribute("data-scene")).toBe("still");
    expect(rail.getAttribute("data-still-reason")).toBe("reduced-motion");
    const journey = screen.getByTestId("home-journey");
    expect(
      within(journey)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(TITLES);
    // Count-up figures show their final value at once.
    expect(screen.getByTestId("journey-figure-net-worth").textContent).toMatch(/^(£[\d,]+)\1$/);
  });
});
