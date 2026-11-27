import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentStopIndex,
  HomeStopControl,
  STOP_ARRIVE_EVENT,
  STOP_CONTROL_RETURN_MS,
} from "./HomeStopControl";

const NAMES = ["One picture", "Five areas", "Accounts"] as const;

/** Three stops, each labelled by its heading, with tops that the test sets. */
const Page = () => (
  <>
    <header>Header</header>
    {NAMES.map((name, i) => (
      <section
        aria-labelledby={`stop-${i}`}
        data-home-section=""
        data-home-section-name={name}
        id={`section-${i}`}
        key={name}
      >
        <h2 id={`stop-${i}`}>{name} heading</h2>
      </section>
    ))}
    <HomeStopControl aside={<span data-testid="aside">Aside</span>} />
  </>
);

/** Puts each stop's top at the given viewport position. */
const placeStops = (tops: readonly number[]) => {
  document.querySelectorAll<HTMLElement>("[data-home-section]").forEach((stop, i) => {
    stop.getBoundingClientRect = () => ({ top: tops[i] ?? 0 }) as DOMRect;
  });
};

/** Renders the page, then places the stops and lets the control measure them (a resize). */
const renderPage = (tops: readonly number[] = [0, 500, 1400]) => {
  const result = render(<Page />);
  placeStops(tops);
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
  return result;
};

const stubMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("currentStopIndex", () => {
  // Header 64, viewport 900: the default line is 64 + 900 / 3 = 364.
  it("makes a stop current once its top reaches the header plus a third of the screen", () => {
    const at = (top: number) => [
      { top: -500, line: 1 / 3 },
      { top, line: 1 / 3 },
    ];
    expect(currentStopIndex(at(364), 64, 900)).toBe(1);
    expect(currentStopIndex(at(365), 64, 900)).toBe(0);
  });

  it("uses a stop's own line when it has one", () => {
    // Line 0: current only when its top meets the header (64).
    const tops = [
      { top: -500, line: 1 / 3 },
      { top: 65, line: 0 },
    ];
    expect(currentStopIndex(tops, 64, 900)).toBe(0);
    expect(
      currentStopIndex([tops[0] as { top: number; line: number }, { top: 64, line: 0 }], 64, 900),
    ).toBe(1);
  });
});

describe("HomeStopControl", () => {
  it("renders nothing in the server HTML, where the scroll position is unknown", () => {
    expect(renderToString(<HomeStopControl />)).toBe("");
  });

  it("shows '1 of 3' and the first stop's name, in a nav named Sections, with the aside", () => {
    stubMotion(false);
    renderPage();
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeDefined();
    expect(screen.getByTestId("stop-control-label").textContent).toBe("1 of 3 One picture");
    expect(screen.getByTestId("aside").textContent).toBe("Aside");
  });

  it("disables previous at the first stop and names the next one", () => {
    stubMotion(false);
    renderPage();
    const previous = screen.getByRole("button", { name: "Previous section" });
    expect(previous.hasAttribute("disabled")).toBe(true);
    const next = screen.getByRole("button", { name: "Next section: Five areas" });
    expect(next.hasAttribute("disabled")).toBe(false);
  });

  it("moves to the next stop: scrolls it under the header and focuses its heading", () => {
    stubMotion(false);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    renderPage([0, 500, 1400]);
    const header = document.querySelector("header") as HTMLElement;
    Object.defineProperty(header, "offsetHeight", { value: 64, configurable: true });
    act(() => fireEvent.click(screen.getByRole("button", { name: "Next section: Five areas" })));
    // scrollY is 0, so the target is the stop's top (500) less the header (64).
    expect(scrollTo).toHaveBeenCalledWith({ top: 436, behavior: "smooth" });
    const heading = document.getElementById("stop-1");
    expect(document.activeElement).toBe(heading);
    expect(heading?.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByTestId("stop-control-label").textContent).toBe("2 of 3 Five areas");
  });

  it("tells the stop to finish arriving before it moves focus, so a heading hidden for its arrive can take it", () => {
    stubMotion(false);
    vi.stubGlobal("scrollTo", vi.fn());
    renderPage([0, 500, 1400]);
    const stop = document.getElementById("section-1") as HTMLElement;
    const heading = document.getElementById("stop-1") as HTMLElement;
    // A stop still waiting to arrive: its heading takes no focus until the stop is shown.
    heading.style.visibility = "hidden";
    const realFocus = HTMLElement.prototype.focus;
    vi.spyOn(heading, "focus").mockImplementation(function (this: HTMLElement, options) {
      if (this.style.visibility !== "hidden") realFocus.call(this, options);
    });
    const arrived = vi.fn(() => {
      heading.style.visibility = "";
    });
    stop.addEventListener(STOP_ARRIVE_EVENT, arrived);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Next section: Five areas" })));
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(heading);
  });

  it("finishes a smooth scroll that stopped short, once, when the scroll ends", () => {
    stubMotion(false);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    renderPage([0, 500, 1400]);
    const header = document.querySelector("header") as HTMLElement;
    Object.defineProperty(header, "offsetHeight", { value: 64, configurable: true });
    act(() => fireEvent.click(screen.getByRole("button", { name: "Next section: Five areas" })));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    // The scroll stopped at 0, short of 436 (the stubs keep the stop at 500): jump the rest.
    act(() => window.dispatchEvent(new Event("scrollend")));
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 436, behavior: "auto" });
    // Only once: a later scroll end does nothing.
    act(() => window.dispatchEvent(new Event("scrollend")));
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it("jumps without smooth scrolling under reduced motion", () => {
    stubMotion(true);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    renderPage([0, 300, 900]);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Next section: Five areas" })));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
    // A jump cannot stop short, so nothing waits for the scroll to end.
    act(() => window.dispatchEvent(new Event("scrollend")));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("follows the scroll, disables next at the last stop and names the previous one", () => {
    stubMotion(false);
    renderPage([-2000, -1000, 100]);
    expect(screen.getByTestId("stop-control-label").textContent).toBe("3 of 3 Accounts");
    expect(screen.getByRole("button", { name: "Next section" }).hasAttribute("disabled")).toBe(
      true,
    );
    act(() =>
      fireEvent.click(screen.getByRole("button", { name: "Previous section: Five areas" })),
    );
    expect(document.activeElement).toBe(document.getElementById("stop-1"));
  });

  it("steps out of the way while scrolling and returns 700ms after the last scroll", () => {
    stubMotion(false);
    vi.useFakeTimers();
    const { container } = renderPage();
    const dock = container.querySelector("[data-stop-control]");
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(dock?.hasAttribute("data-scrolling")).toBe(true);
    act(() => vi.advanceTimersByTime(STOP_CONTROL_RETURN_MS - 1));
    expect(dock?.hasAttribute("data-scrolling")).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(dock?.hasAttribute("data-scrolling")).toBe(false);
  });

  it("renders nothing with fewer than two stops", () => {
    stubMotion(false);
    const { container } = render(<HomeStopControl />);
    expect(container.innerHTML).toBe("");
  });
});
