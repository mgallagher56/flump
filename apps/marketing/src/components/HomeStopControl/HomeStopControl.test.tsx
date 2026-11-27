import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentStopIndex,
  HomeStopControl,
  holdAction,
  STOP_ARRIVE_EVENT,
  STOP_CONTROL_RETURN_MS,
  STOP_HOLD_MS,
  STOP_HOLD_TICK_MS,
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

describe("holdAction", () => {
  it("jumps only when the scroll has stopped more than 2px from the stop's place", () => {
    expect(holdAction({ y: 100, top: 103, stopped: true })).toBe("jump");
    expect(holdAction({ y: 106, top: 103, stopped: true })).toBe("jump");
    // On the edge: 2px away is there.
    expect(holdAction({ y: 101, top: 103, stopped: true })).toBe("stay");
    expect(holdAction({ y: 105, top: 103, stopped: true })).toBe("stay");
    // Still on its way: wait.
    expect(holdAction({ y: 0, top: 436, stopped: false })).toBe("stay");
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

  describe("holding a smooth move in place", () => {
    /** Makes the page scroll: each stop's top moves up as `scrollY` grows from `base`. */
    const scrollable = (base: number[]) => {
      let y = 0;
      vi.spyOn(window, "scrollY", "get").mockImplementation(() => y);
      document.querySelectorAll<HTMLElement>("[data-home-section]").forEach((stop, i) => {
        stop.getBoundingClientRect = () => ({ top: (base[i] ?? 0) - y }) as DOMRect;
      });
      const scrollTo = vi.fn((options: ScrollToOptions) => {
        y = options.top ?? y;
      });
      vi.stubGlobal("scrollTo", scrollTo);
      return { scrollTo, setY: (next: number) => (y = next) };
    };

    /** Renders, sets the header to 64px and moves to the second stop (436: its top 500 less 64). */
    const moveToSecond = (base = [0, 500, 1400]) => {
      stubMotion(false);
      vi.useFakeTimers();
      renderPage(base);
      Object.defineProperty(document.querySelector("header"), "offsetHeight", {
        value: 64,
        configurable: true,
      });
      const page = scrollable(base);
      // The smooth scroll is stopped before it moves (scrollY stays 0).
      page.scrollTo.mockImplementationOnce(() => {});
      act(() => fireEvent.click(screen.getByRole("button", { name: "Next section: Five areas" })));
      expect(page.scrollTo).toHaveBeenCalledWith({ top: 436, behavior: "smooth" });
      return page;
    };

    it("jumps the rest when the scroll ends short of the stop, and stays once there", () => {
      const { scrollTo } = moveToSecond();
      act(() => window.dispatchEvent(new Event("scrollend")));
      expect(scrollTo).toHaveBeenCalledTimes(2);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 436, behavior: "auto" });
      // There now: a later scroll end and the checks do nothing.
      act(() => window.dispatchEvent(new Event("scrollend")));
      act(() => vi.advanceTimersByTime(1000));
      expect(scrollTo).toHaveBeenCalledTimes(2);
    });

    it("shows the stop finished again after each jump, in case the page passed it on the way", () => {
      const arrived = vi.fn();
      // The page renders inside `moveToSecond`, so listen on the document for the second stop.
      const onArrive = (event: Event) => {
        if ((event.target as HTMLElement).id === "section-1") arrived();
      };
      document.addEventListener(STOP_ARRIVE_EVENT, onArrive, true);
      moveToSecond();
      // Once as the move starts.
      expect(arrived).toHaveBeenCalledTimes(1);
      act(() => window.dispatchEvent(new Event("scrollend")));
      expect(arrived).toHaveBeenCalledTimes(2);
      // There now: no jump, so no more.
      act(() => vi.advanceTimersByTime(1000));
      expect(arrived).toHaveBeenCalledTimes(2);
      document.removeEventListener(STOP_ARRIVE_EVENT, onArrive, true);
    });

    it("jumps when the scroll was stopped before it moved, with no scroll end at all", () => {
      const { scrollTo } = moveToSecond();
      act(() => vi.advanceTimersByTime(STOP_HOLD_TICK_MS - 1));
      expect(scrollTo).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(1));
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 436, behavior: "auto" });
    });

    it("waits while the smooth scroll is still on its way", () => {
      const { scrollTo, setY } = moveToSecond();
      setY(120);
      act(() => vi.advanceTimersByTime(STOP_HOLD_TICK_MS));
      // Moved since the move began: still on its way, nothing to do.
      expect(scrollTo).toHaveBeenCalledTimes(1);
      // Stuck at 120 by the next check: jump the rest.
      act(() => vi.advanceTimersByTime(STOP_HOLD_TICK_MS));
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 436, behavior: "auto" });
    });

    it("follows the stop when the page lengthens above it after it lands", () => {
      const base = [0, 500, 1400];
      const { scrollTo } = moveToSecond(base);
      act(() => window.dispatchEvent(new Event("scrollend")));
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 436, behavior: "auto" });
      // The hero's pin adds 3000px above the stop: its place is now 3500 − 64 = 3436.
      base[1] = 3500;
      act(() => vi.advanceTimersByTime(STOP_HOLD_TICK_MS));
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 3436, behavior: "auto" });
    });

    it.each(["wheel", "touchstart", "keydown", "pointerdown"])(
      "lets go when the reader scrolls by themselves (%s)",
      (type) => {
        const { scrollTo } = moveToSecond();
        act(() => window.dispatchEvent(new Event(type)));
        act(() => window.dispatchEvent(new Event("scrollend")));
        act(() => vi.advanceTimersByTime(1000));
        expect(scrollTo).toHaveBeenCalledTimes(1);
      },
    );

    it("keeps counting the stop it moves to while the page settles, and follows the reader after", () => {
      const { setY } = moveToSecond();
      const label = screen.getByTestId("stop-control-label");
      expect(label.textContent).toBe("2 of 3 Five areas");
      // The page measures itself again and resets the scroll to the top for a moment.
      setY(0);
      act(() => window.dispatchEvent(new Event("scroll")));
      expect(label.textContent).toBe("2 of 3 Five areas");
      // The reader scrolls by themselves: the count follows the page again (the second stop's
      // top at 500 is below the line at 64 + 768 / 3 = 320, so the first stop is current).
      act(() => window.dispatchEvent(new Event("wheel")));
      act(() => window.dispatchEvent(new Event("scroll")));
      expect(label.textContent).toBe("1 of 3 One picture");
    });

    it("lets go after 4 seconds", () => {
      const { scrollTo, setY } = moveToSecond();
      // Moving all the while, so no check jumps, until the hold ends.
      for (let t = 0; t < STOP_HOLD_MS; t += STOP_HOLD_TICK_MS) {
        setY(t / 100 + 1);
        act(() => vi.advanceTimersByTime(STOP_HOLD_TICK_MS));
      }
      expect(scrollTo).toHaveBeenCalledTimes(1);
      act(() => window.dispatchEvent(new Event("scrollend")));
      act(() => vi.advanceTimersByTime(1000));
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("holds only the latest move", () => {
      const { scrollTo } = moveToSecond();
      // A second move, to the third stop (1400 − 64 = 1336), ends the first one's hold.
      scrollTo.mockImplementationOnce(() => {});
      act(() => fireEvent.click(screen.getByRole("button", { name: "Next section: Accounts" })));
      act(() => window.dispatchEvent(new Event("scrollend")));
      expect(scrollTo).toHaveBeenCalledTimes(3);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 1336, behavior: "auto" });
    });

    it("lets go when the control unmounts", () => {
      stubMotion(false);
      vi.useFakeTimers();
      const { unmount } = renderPage();
      const { scrollTo } = scrollable([0, 500, 1400]);
      scrollTo.mockImplementationOnce(() => {});
      act(() => fireEvent.click(screen.getByRole("button", { name: "Next section: Five areas" })));
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
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
