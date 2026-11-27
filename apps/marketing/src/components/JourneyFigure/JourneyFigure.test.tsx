import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JourneyFigure } from "./JourneyFigure";

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const setReducedMotion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

/** An IntersectionObserver that never reports the figure in view. */
class NeverObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}

afterEach(() => vi.unstubAllGlobals());

describe("JourneyFigure", () => {
  it("has its final value in the server HTML, for sight and for assistive technology", () => {
    const html = renderToString(<JourneyFigure format={gbp} value={232000} />);
    expect(html.match(/£232,000/g)).toHaveLength(2);
    expect(html).toContain('aria-hidden="true"');
  });

  it("gives assistive technology only the final value while the digits wait to count", async () => {
    setReducedMotion(false);
    vi.stubGlobal("IntersectionObserver", NeverObserver);
    render(<JourneyFigure data-testid="figure" format={gbp} value={232000} />);
    await act(async () => {});
    const figure = screen.getByTestId("figure");
    const [spoken, shown] = Array.from(figure.children);
    expect(spoken?.textContent).toBe("£232,000");
    expect(shown?.getAttribute("aria-hidden")).toBe("true");
    expect(shown?.textContent).toBe("£0");
  });

  it("never moves under reduced motion", async () => {
    setReducedMotion(true);
    vi.stubGlobal("IntersectionObserver", NeverObserver);
    render(<JourneyFigure data-testid="figure" format={gbp} value={232000} />);
    await act(async () => {});
    expect(screen.getByTestId("figure").textContent).toBe("£232,000£232,000");
  });
});
