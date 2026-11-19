import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollRestoreAfterGrowth } from "./useScrollRestoreAfterGrowth";

/** A fake document scroller: the browser clamps any offset to the page's current height. */
let maxScroll = 0;
let scrollY = 0;
const scrollTo = vi.fn((_x: number, y: number) => {
  scrollY = Math.max(0, Math.min(y, maxScroll));
});
let resizeCallbacks: Array<() => void> = [];

class FakeResizeObserver {
  constructor(private readonly callback: () => void) {}
  observe() {
    resizeCallbacks.push(this.callback);
  }
  disconnect() {
    resizeCallbacks = resizeCallbacks.filter((cb) => cb !== this.callback);
  }
  unobserve() {}
}

/** The page reaches a new height and its size observers fire. */
function pageGrowsTo(height: number) {
  maxScroll = height;
  act(() => {
    for (const cb of [...resizeCallbacks]) cb();
  });
}

function Shell() {
  useScrollRestoreAfterGrowth();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/budget")}>
        Budget
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <Outlet />
    </>
  );
}

function renderApp() {
  const router = createMemoryRouter([
    {
      path: "/",
      element: <Shell />,
      children: [
        { index: true, element: <p>Home</p> },
        { path: "budget", element: <p>Budget page</p> },
      ],
    },
  ]);
  // What <ScrollRestoration> switches on in the app: offsets saved per history entry.
  router.enableScrollRestoration({}, () => scrollY);
  render(<RouterProvider router={router} />);
  return router;
}

describe("useScrollRestoreAfterGrowth", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    scrollTo.mockClear();
    resizeCallbacks = [];
    maxScroll = 2000;
    scrollY = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Reads Home at 900px, opens Budget, and goes Back while Home is still short. */
  function readHomeThenBackWhileShort() {
    const router = renderApp();
    scrollY = 900;
    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    scrollY = 0;
    // Home renders before its charts have their size: only 300px of scroll.
    maxScroll = 300;
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    return router;
  }

  it("lands on the saved place once the page has grown tall enough", async () => {
    readHomeThenBackWhileShort();
    expect(await screen.findByText("Home")).toBeTruthy();
    // Clamped at first: the page is too short for 900.
    expect(scrollY).toBe(300);
    pageGrowsTo(2000);
    // Working: saved 900, page now 2000 tall, so the offset is reached exactly.
    expect(scrollY).toBe(900);
  });

  it("lets go when the reader scrolls", async () => {
    readHomeThenBackWhileShort();
    await screen.findByText("Home");
    fireEvent.wheel(window);
    pageGrowsTo(2000);
    expect(scrollY).toBe(300);
  });

  it("lets go after the hold time", async () => {
    readHomeThenBackWhileShort();
    await screen.findByText("Home");
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    pageGrowsTo(2000);
    expect(scrollY).toBe(300);
  });

  it("does nothing on a new page (push), which opens at the top", async () => {
    renderApp();
    scrollY = 900;
    fireEvent.click(screen.getByRole("button", { name: "Budget" }));
    await screen.findByText("Budget page");
    scrollY = 0;
    pageGrowsTo(2000);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
