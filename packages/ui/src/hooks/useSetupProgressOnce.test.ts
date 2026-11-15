import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStoredStepCount, storeStepCount, useSetupProgressOnce } from "./useSetupProgressOnce";

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

describe("useSetupProgressOnce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearStoredStepCount();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearStoredStepCount();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("renders the current value immediately on first visit with no stored progress", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useSetupProgressOnce(3));

    expect(result.current.currentValue).toBe(3);
    expect(result.current.isAnimating).toBe(false);
  });

  it("animates once when returning to dashboard after a step was completed", () => {
    mockMatchMedia(false);
    // Previously completed 2 steps
    storeStepCount(2);

    // Now viewed with 3 steps completed
    const { result } = renderHook(() => useSetupProgressOnce(3));

    expect(result.current.isAnimating).toBe(true);
    expect(result.current.currentValue).toBe(2);

    act(() => {
      // Run rAF
      vi.advanceTimersByTime(16);
    });
    expect(result.current.currentValue).toBe(3);

    act(() => {
      // Advance remaining durations.slow (320ms)
      vi.advanceTimersByTime(320);
    });
    expect(result.current.isAnimating).toBe(false);
  });

  it("shows immediate end state with no animation under prefers-reduced-motion", () => {
    mockMatchMedia(true);
    storeStepCount(2);

    const { result } = renderHook(() => useSetupProgressOnce(3));

    expect(result.current.currentValue).toBe(3);
    expect(result.current.isAnimating).toBe(false);
  });
});
