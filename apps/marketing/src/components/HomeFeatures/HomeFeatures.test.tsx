import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GsapKit } from "../../motion/loadGsapKit";
import { FEATURE_PICTURES, FEATURES_LIST_ID, featuresMoment, HomeFeatures } from "./HomeFeatures";

// The GSAP moment loads after first paint in the browser; here only the markup is under test.
vi.mock("../../motion/useGsapMoment", () => ({ useGsapMoment: vi.fn() }));

const renderFeatures = () =>
  render(
    <MemoryRouter>
      <HomeFeatures />
    </MemoryRouter>,
  );

describe("HomeFeatures: the markup without script (MK1)", () => {
  it("renders all six tiles in order, each linked to its page, with the AI access line", () => {
    renderFeatures();
    const list = screen.getByRole("list", { name: "Flump features" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual([
      "/features/accounts",
      "/features/budget",
      "/features/pay",
      "/features/savings-and-pension",
      "/features/debt-and-borrowing",
      "/features/ai-connection",
    ]);
    expect(
      within(list).getByText("Switched on for an account on request during testing."),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "All Flump features on one page" }).getAttribute("href"),
    ).toBe("/features");
  });

  it("is the 'Five areas' stop, and each tile carries the tilt-and-light hover", () => {
    const { container } = renderFeatures();
    const band = container.querySelector("#features");
    expect(band?.getAttribute("data-home-section-name")).toBe("Five areas");
    expect(band?.querySelector("[data-bubble-field]")?.getAttribute("data-bubble-field")).toBe("b");
    expect(container.querySelectorAll("li[data-feature]")).toHaveLength(6);
  });

  it("gives each tile its own document picture, hidden from assistive technology", () => {
    const { container } = renderFeatures();
    const scenes = [...container.querySelectorAll("svg[data-variant=document]")];
    expect(scenes.map((svg) => svg.getAttribute("data-scene"))).toEqual(
      Object.values(FEATURE_PICTURES),
    );
    for (const svg of scenes) expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("has no controls until script measures an overflow, and never a count", () => {
    const { container } = renderFeatures();
    expect(screen.getByTestId("home-features-controls").hasAttribute("hidden")).toBe(true);
    expect(container.textContent ?? "").not.toMatch(/\d+ (to|of) \d+/);
  });
});

/*
 * Layout stubs: the row is 600px wide and 1,800px long; each tile is 280px wide on a 300px step,
 * so two tiles are fully in view at a time. The scroll position is `scrollX`.
 */
let scrollX = 0;
const scrollTo = vi.fn();
const tileIndex = (el: Element) => Array.from(el.parentElement?.children ?? []).indexOf(el);
const isList = (el: Element) => el.id === FEATURES_LIST_ID;
const originalRect = Element.prototype.getBoundingClientRect;

function stubLayout() {
  Object.defineProperties(HTMLElement.prototype, {
    scrollWidth: {
      configurable: true,
      get(this: HTMLElement) {
        return isList(this) ? 1800 : 0;
      },
    },
    clientWidth: {
      configurable: true,
      get(this: HTMLElement) {
        return isList(this) ? 600 : 0;
      },
    },
    scrollLeft: {
      configurable: true,
      get(this: HTMLElement) {
        return isList(this) ? scrollX : 0;
      },
      set() {},
    },
    scrollTo: { configurable: true, value: scrollTo },
  });
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (isList(this)) return { left: 0, right: 600, top: 0, bottom: 400 } as DOMRect;
    if (this.parentElement && isList(this.parentElement)) {
      const left = tileIndex(this) * 300 - scrollX;
      return { left, right: left + 280, top: 0, bottom: 400 } as DOMRect;
    }
    return originalRect.call(this);
  };
}

function unstubLayout() {
  for (const key of ["scrollWidth", "clientWidth", "scrollLeft", "scrollTo"]) {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
  }
  Element.prototype.getBoundingClientRect = originalRect;
}

/** Scrolls the row and lets the frame-batched measurement run. */
function scrollRowTo(x: number) {
  scrollX = x;
  fireEvent.scroll(screen.getByRole("list", { name: "Flump features" }));
  act(() => vi.advanceTimersByTime(20));
}

const dot = (name: string) =>
  within(screen.getByRole("group", { name: "Flump features" })).getByRole("button", { name });
const currentDot = () =>
  within(screen.getByRole("group", { name: "Flump features" }))
    .getAllByRole("button")
    .filter((b) => b.getAttribute("aria-current") === "true")
    .map((b) => b.textContent);

describe("HomeFeatures: the carousel dots (MK9)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    scrollX = 0;
    scrollTo.mockClear();
    stubLayout();
  });
  afterEach(() => {
    unstubLayout();
    vi.useRealTimers();
  });

  it("shows previous, one dot per tile named by its tile, and next once the row overflows", () => {
    renderFeatures();
    expect(screen.getByTestId("home-features-controls").hasAttribute("hidden")).toBe(false);
    const dots = within(screen.getByRole("group", { name: "Flump features" })).getAllByRole(
      "button",
    );
    expect(dots.map((b) => b.textContent)).toEqual([
      "Accounts",
      "Budget",
      "Pay",
      "Savings and pension",
      "Debt and borrowing",
      "AI connection",
    ]);
    expect(currentDot()).toEqual(["Accounts"]);
    // At the start, previous is disabled but stays focusable; next names the tile it shows.
    const previous = screen.getByRole("button", { name: "Previous" });
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Next: Budget" }).getAttribute("aria-disabled")).toBe(
      null,
    );
  });

  it("scrolls to the chosen tile, then marks its dot once the row has moved there", () => {
    renderFeatures();
    fireEvent.click(dot("Pay"));
    // Pay is the third tile: 2 × 300px along the row, from a row scrolled to 0.
    expect(scrollTo).toHaveBeenCalledWith({ left: 600, behavior: "smooth" });

    scrollRowTo(600);
    expect(currentDot()).toEqual(["Pay"]);
    expect(screen.getByRole("button", { name: "Previous: Budget" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Next: Savings and pension" }));
    // From 600px, the fourth tile sits 300px further on.
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 900, behavior: "smooth" });
  });

  it("marks the last dot and disables next at the end of the row", () => {
    renderFeatures();
    // 1,800 − 600: the end. Tiles five and six are in view.
    scrollRowTo(1200);
    expect(currentDot()).toEqual(["AI connection"]);
    const next = screen.getByRole("button", { name: "Next" });
    expect(next.getAttribute("aria-disabled")).toBe("true");
    scrollTo.mockClear();
    fireEvent.click(next);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("jumps without smooth scrolling under reduced motion", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      renderFeatures();
      fireEvent.click(dot("Budget"));
      expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: "auto" });
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("featuresMoment", () => {
  /** A list whose right edge is at 400px, with one tile per left edge given. */
  const band = (lefts: number[] | null) => {
    const root = document.createElement("section");
    if (lefts) {
      const list = document.createElement("ul");
      list.id = FEATURES_LIST_ID;
      list.getBoundingClientRect = () => ({ right: 400 }) as DOMRect;
      for (const left of lefts) {
        const tile = document.createElement("li");
        tile.getBoundingClientRect = () => ({ left }) as DOMRect;
        list.append(tile);
      }
      root.append(list);
    }
    const from = vi.fn();
    featuresMoment({ gsap: { from } } as unknown as GsapKit, root);
    return { root, from };
  };

  it("brings in only the tiles at least 24px inside the list's right edge, once by time", () => {
    // Edge 400 - 24 = 376: a tile at 375 is in view, one at 376 is off to the side.
    const { root, from } = band([0, 375, 376, 600]);
    const tiles = Array.from(root.querySelectorAll("li"));
    expect(from).toHaveBeenCalledTimes(1);
    const [targets, vars] = from.mock.calls[0] as [Element[], Record<string, unknown>];
    expect(targets).toHaveLength(2);
    expect(targets[0]).toBe(tiles[0]);
    expect(targets[1]).toBe(tiles[1]);
    // Entry 1540ms and stagger 196ms in seconds.
    expect(vars).toMatchObject({
      y: 20,
      opacity: 0,
      duration: 1.54,
      stagger: 0.196,
      ease: "calm",
      clearProps: "transform,opacity",
    });
    const trigger = vars.scrollTrigger as Record<string, unknown>;
    expect(trigger.trigger).toBe(root.querySelector("ul"));
    expect(trigger.start).toBe("top 86%");
    expect(trigger.once).toBe(true);
  });

  it("moves nothing with no tile in view or no list", () => {
    expect(band([376, 500]).from).not.toHaveBeenCalled();
    expect(band(null).from).not.toHaveBeenCalled();
  });
});
