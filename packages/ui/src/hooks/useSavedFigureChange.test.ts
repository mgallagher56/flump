import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedFigureChange } from "./useSavedFigureChange";

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

describe("useSavedFigureChange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("shows the initial value with no animation on mount", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useSavedFigureChange(100));

    expect(result.current.displayedValue).toBe(100);
    expect(result.current.isOut).toBe(false);
    expect(result.current.isWashed).toBe(false);
  });

  it("does not trigger animations on ordinary re-render with the same value", () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(({ val }) => useSavedFigureChange(val), {
      initialProps: { val: 100 },
    });

    rerender({ val: 100 });
    expect(result.current.displayedValue).toBe(100);
    expect(result.current.isOut).toBe(false);
    expect(result.current.isWashed).toBe(false);
  });

  it("cross-fades and runs wash when value changes under motion-safe", () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(({ val }) => useSavedFigureChange(val), {
      initialProps: { val: 100 },
    });

    rerender({ val: 200 });

    // Step 1: fade-out phase (isOut is true, old value still displayed)
    expect(result.current.isOut).toBe(true);
    expect(result.current.displayedValue).toBe(100);
    expect(result.current.isWashed).toBe(false);

    // Advance 120ms (durations.fast)
    act(() => {
      vi.advanceTimersByTime(120);
    });

    // Step 2: swap value, fade in, wash is active
    expect(result.current.isOut).toBe(false);
    expect(result.current.displayedValue).toBe(200);
    expect(result.current.isWashed).toBe(true);

    // Advance 899ms (durations.scene is 900ms)
    act(() => {
      vi.advanceTimersByTime(899);
    });
    expect(result.current.isWashed).toBe(true);

    // Advance remaining 1ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isWashed).toBe(false);
  });

  it("keeps the wash for its full length when a second save lands during the first wash", () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(({ val }) => useSavedFigureChange(val), {
      initialProps: { val: 100 },
    });

    rerender({ val: 200 });
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current.isWashed).toBe(true);

    // Second save 120ms into the first wash: its wash runs from 240ms to 1140ms.
    rerender({ val: 300 });
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current.displayedValue).toBe(300);

    // Past the first wash's end (1020ms): the second wash must still be showing.
    act(() => {
      vi.advanceTimersByTime(860);
    });
    expect(result.current.isWashed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(result.current.isWashed).toBe(false);
  });

  it("clears the wash timer on unmount", () => {
    mockMatchMedia(false);
    const { rerender, unmount } = renderHook(({ val }) => useSavedFigureChange(val), {
      initialProps: { val: 100 },
    });

    rerender({ val: 200 });
    act(() => {
      vi.advanceTimersByTime(120);
    });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows immediate end state with no animation under prefers-reduced-motion", () => {
    mockMatchMedia(true);
    const { result, rerender } = renderHook(({ val }) => useSavedFigureChange(val), {
      initialProps: { val: 100 },
    });

    rerender({ val: 200 });

    // Immediate end state: new value is shown, no fade, no wash
    expect(result.current.displayedValue).toBe(200);
    expect(result.current.isOut).toBe(false);
    expect(result.current.isWashed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.displayedValue).toBe(200);
    expect(result.current.isOut).toBe(false);
    expect(result.current.isWashed).toBe(false);
  });
});

describe("useSavedFigureChange re-runs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("does not play when only the timings change", () => {
    const { result, rerender } = renderHook(
      ({ val, fadeMs }) => useSavedFigureChange(val, { fadeMs }),
      { initialProps: { val: 100, fadeMs: 120 } },
    );
    rerender({ val: 100, fadeMs: 200 });
    expect(result.current.isOut).toBe(false);
    expect(result.current.displayedValue).toBe(100);
  });

  it("drops the first change when a second save lands during the fade", () => {
    const { result, rerender } = renderHook(({ val }) => useSavedFigureChange(val), {
      initialProps: { val: 100 },
    });
    rerender({ val: 200 });
    act(() => {
      vi.advanceTimersByTime(60);
    });
    rerender({ val: 300 });
    // At 120ms the first fade would have ended; the second runs to 180ms.
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current.displayedValue).toBe(100);
    expect(result.current.isOut).toBe(true);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current.displayedValue).toBe(300);
  });
});
