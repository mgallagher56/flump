import { act, render, renderHook, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calmEase, cubicBezier } from "./marketingTiming";
import { figureAt, useCountUp, useGlide } from "./useMovingFigure";

function mockReducedMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  };
  Object.defineProperty(window, "matchMedia", { value: () => mql, configurable: true });
  return (value: boolean) => {
    matches = value;
    for (const l of [...listeners]) l();
  };
}

const pounds = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

/** The render pattern the module documents: the exact value for assistive technology, digits hidden. */
function SampleFigure({ value, inView }: { value: number; inView: boolean }) {
  const figure = useCountUp(value, { inView, format: pounds });
  return (
    <span data-testid="figure">
      <span data-testid="spoken">{figure.text}</span>
      <span aria-hidden="true" data-testid="drawn">
        {figure.displayText}
      </span>
    </span>
  );
}

/** Advances the fake clock in frame-sized steps, flushing React after each. */
function playFor(ms: number) {
  for (let t = 0; t < ms; t += 16) act(() => vi.advanceTimersByTime(16));
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("easing and figureAt", () => {
  it("solves the calm curve: exact ends, monotonic, ahead of linear early on", () => {
    expect(calmEase(0)).toBe(0);
    expect(calmEase(1)).toBe(1);
    let previous = 0;
    for (let t = 0.05; t < 1; t += 0.05) {
      const y = calmEase(t);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
    // cubic-bezier(0.25, 0.1, 0.2, 1) eases out: at a quarter of the time it is past a quarter.
    expect(calmEase(0.25)).toBeGreaterThan(0.25);
  });

  it("matches the linear curve when the control points lie on the diagonal", () => {
    const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);
    expect(linear(0.3)).toBeCloseTo(0.3, 5);
    expect(linear(0.7)).toBeCloseTo(0.7, 5);
  });

  it("starts on from, lands exactly on to at and after the duration", () => {
    expect(figureAt(100, 2500, 0, 1000)).toBe(100);
    expect(figureAt(100, 2500, 1000, 1000)).toBe(2500);
    expect(figureAt(100, 2500, 5000, 1000)).toBe(2500);
    expect(figureAt(100, 2500, 10, 0)).toBe(2500);
    const mid = figureAt(100, 2500, 500, 1000);
    expect(mid).toBeGreaterThan(100);
    expect(mid).toBeLessThan(2500);
  });
});

describe("useCountUp", () => {
  it("renders the final value on the server, for both the spoken and the drawn figure", () => {
    mockReducedMotion(false);
    const html = renderToString(<SampleFigure value={12400} inView={false} />);
    expect(html).toContain("£12,400</span>");
    expect(html.match(/£12,400/g)).toHaveLength(2);
  });

  it("waits at zero until in view, counts once over 2,240 ms and settles on the exact value", () => {
    mockReducedMotion(false);
    const { rerender } = render(<SampleFigure value={12400} inView={false} />);
    expect(screen.getByTestId("drawn").textContent).toBe("£0");
    // The spoken figure is final from the start, while the drawn one waits or moves.
    expect(screen.getByTestId("spoken").textContent).toBe("£12,400");
    expect(screen.getByTestId("drawn").getAttribute("aria-hidden")).toBe("true");

    rerender(<SampleFigure value={12400} inView />);
    playFor(1000);
    const midway = Number(screen.getByTestId("drawn").textContent?.replace(/[£,]/g, ""));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(12400);
    expect(screen.getByTestId("spoken").textContent).toBe("£12,400");

    playFor(1300);
    expect(screen.getByTestId("drawn").textContent).toBe("£12,400");
  });

  it("does not count again when it leaves view and comes back", () => {
    mockReducedMotion(false);
    const { rerender } = render(<SampleFigure value={500} inView />);
    playFor(2400);
    rerender(<SampleFigure value={500} inView={false} />);
    rerender(<SampleFigure value={500} inView />);
    act(() => vi.advanceTimersByTime(16));
    expect(screen.getByTestId("drawn").textContent).toBe("£500");
  });

  it("never moves under reduced motion", () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(
      ({ inView }) => useCountUp(800, { inView, format: pounds }),
      { initialProps: { inView: false } },
    );
    expect(result.current).toMatchObject({ display: 800, moving: false });
    rerender({ inView: true });
    expect(result.current).toMatchObject({ display: 800, moving: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops its frames when unmounted mid-count", () => {
    mockReducedMotion(false);
    const { unmount } = render(<SampleFigure value={900} inView />);
    playFor(300);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useGlide", () => {
  it("draws the first value at once, without moving on mount", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useGlide(3000, { format: pounds }));
    expect(result.current).toMatchObject({ display: 3000, text: "£3,000", moving: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("glides from the old value to the new over 588 ms, the exact value spoken at once", () => {
    mockReducedMotion(false);
    const { result, rerender } = renderHook(({ v }) => useGlide(v, { format: pounds }), {
      initialProps: { v: 3000 },
    });
    rerender({ v: 3600 });
    expect(result.current.text).toBe("£3,600");
    expect(result.current.moving).toBe(true);
    playFor(300);
    expect(result.current.display).toBeGreaterThan(3000);
    expect(result.current.display).toBeLessThan(3600);
    playFor(320);
    expect(result.current).toMatchObject({ display: 3600, displayText: "£3,600", moving: false });
  });

  it("glides on from the figure shown when the input changes mid-glide", () => {
    mockReducedMotion(false);
    const { result, rerender } = renderHook(({ v }) => useGlide(v), {
      initialProps: { v: 0 },
    });
    rerender({ v: 1000 });
    playFor(200);
    const shown = result.current.display;
    rerender({ v: 2000 });
    expect(result.current.display).toBe(shown);
    playFor(700);
    expect(result.current.display).toBe(2000);
  });

  it("changes at once under reduced motion", () => {
    mockReducedMotion(true);
    const { result, rerender } = renderHook(({ v }) => useGlide(v), {
      initialProps: { v: 10 },
    });
    rerender({ v: 20 });
    expect(result.current).toMatchObject({ display: 20, moving: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("lands at once when reduced motion turns on mid-glide", () => {
    const setReduced = mockReducedMotion(false);
    const { result, rerender } = renderHook(({ v }) => useGlide(v), {
      initialProps: { v: 10 },
    });
    rerender({ v: 20 });
    playFor(100);
    act(() => setReduced(true));
    expect(result.current).toMatchObject({ display: 20, moving: false });
  });
});
