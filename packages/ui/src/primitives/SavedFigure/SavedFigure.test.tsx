import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedFigure } from "./SavedFigure";

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((_: string, l: () => void) => listeners.add(l)),
    removeEventListener: vi.fn((_: string, l: () => void) => listeners.delete(l)),
  };
  const matchMedia = vi.fn(() => mql);
  vi.stubGlobal("matchMedia", matchMedia);
  Object.defineProperty(window, "matchMedia", { value: matchMedia, configurable: true });
  return {
    mql,
    set(value: boolean) {
      matches = value;
      for (const l of [...listeners]) l();
    },
  };
}

describe("SavedFigure", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("renders with id and data-testid paired, and initial value without animation", () => {
    mockMatchMedia(false);
    render(<SavedFigure id="test-figure" label="Savings" value="£1,000" />);

    const root = screen.getByTestId("test-figure");
    expect(root.id).toBe("test-figure");
    expect(root.getAttribute("data-wash")).toBe("false");

    const val = screen.getByTestId("test-figure-value");
    expect(val.textContent).toBe("£1,000");
    expect(val.getAttribute("data-out")).toBe("false");

    expect(screen.getByTestId("test-figure-label").textContent).toBe("Savings");
  });

  it("plays cross-fade and wash once when value changes under motion-safe", () => {
    mockMatchMedia(false);
    const { rerender } = render(
      <SavedFigure id="test-figure" label="Current account" value="£1,000" />,
    );

    rerender(<SavedFigure id="test-figure" label="Current account" value="£1,500" />);

    const root = screen.getByTestId("test-figure");
    const val = screen.getByTestId("test-figure-value");

    // Phase 1: fade-out
    expect(val.getAttribute("data-out")).toBe("true");
    expect(val.textContent).toBe("£1,000");
    expect(root.getAttribute("data-wash")).toBe("false");

    // Advance 120ms (durations.fast)
    act(() => {
      vi.advanceTimersByTime(120);
    });

    // Phase 2: swap and wash
    expect(val.getAttribute("data-out")).toBe("false");
    expect(val.textContent).toBe("£1,500");
    expect(root.getAttribute("data-wash")).toBe("true");

    // Advance 900ms (durations.scene)
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(root.getAttribute("data-wash")).toBe("false");
  });

  it("shows immediate end state without wash or fade under prefers-reduced-motion", () => {
    mockMatchMedia(true);
    const { rerender } = render(
      <SavedFigure id="test-figure" label="Current account" value="£1,000" />,
    );

    rerender(<SavedFigure id="test-figure" label="Current account" value="£1,500" />);

    const root = screen.getByTestId("test-figure");
    const val = screen.getByTestId("test-figure-value");

    expect(val.textContent).toBe("£1,500");
    expect(val.getAttribute("data-out")).toBe("false");
    expect(root.getAttribute("data-wash")).toBe("false");

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(val.textContent).toBe("£1,500");
    expect(root.getAttribute("data-wash")).toBe("false");
  });
});
