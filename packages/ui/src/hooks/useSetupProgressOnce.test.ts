import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredStepCount,
  getStoredStepCount,
  storeStepCount,
  useSetupProgressOnce,
} from "./useSetupProgressOnce";

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

  it("keeps the server-painted length on a server-rendered page and records it as seen", () => {
    mockMatchMedia(false);
    storeStepCount(2);
    const container = document.body.appendChild(document.createElement("div"));

    const { result } = renderHook(() => useSetupProgressOnce(3), {
      container,
      hydrate: true,
      wrapper: StrictMode,
    });
    expect(result.current.currentValue).toBe(3);
    expect(result.current.isAnimating).toBe(false);
    expect(getStoredStepCount()).toBe(3);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.currentValue).toBe(3);
    expect(result.current.isAnimating).toBe(false);
  });

  it("fills when the ring mounts on the client after hydration", () => {
    mockMatchMedia(false);
    const container = document.body.appendChild(document.createElement("div"));
    renderHook(() => useSetupProgressOnce(2), { container, hydrate: true });
    expect(getStoredStepCount()).toBe(2);

    // A client navigation back to the dashboard after another step was done.
    const { result } = renderHook(() => useSetupProgressOnce(3));
    expect(result.current.currentValue).toBe(2);
    expect(result.current.isAnimating).toBe(true);
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(result.current.currentValue).toBe(3);
  });

  it("still fills to the new count and finishes under StrictMode's double effect run", () => {
    mockMatchMedia(false);
    storeStepCount(2);

    const { result } = renderHook(() => useSetupProgressOnce(3), { wrapper: StrictMode });
    expect(result.current.currentValue).toBe(2);
    expect(result.current.isAnimating).toBe(true);

    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(result.current.currentValue).toBe(3);

    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(result.current.isAnimating).toBe(false);
    expect(getStoredStepCount()).toBe(3);
  });

  it("saves the count only once the fill has played", () => {
    mockMatchMedia(false);
    storeStepCount(2);

    renderHook(() => useSetupProgressOnce(3));
    expect(getStoredStepCount()).toBe(2);

    act(() => {
      vi.advanceTimersByTime(336);
    });
    expect(getStoredStepCount()).toBe(3);
  });

  it("jumps to the new length when reduced motion resolves during the fill", () => {
    const media = mockMatchMedia(false);
    storeStepCount(2);

    const { result } = renderHook(() => useSetupProgressOnce(3));
    expect(result.current.isAnimating).toBe(true);

    act(() => media.set(true));
    expect(result.current.currentValue).toBe(3);
    expect(result.current.isAnimating).toBe(false);
    expect(getStoredStepCount()).toBe(3);
  });

  it("shows immediate end state with no animation under prefers-reduced-motion", () => {
    mockMatchMedia(true);
    storeStepCount(2);

    const { result } = renderHook(() => useSetupProgressOnce(3));

    expect(result.current.currentValue).toBe(3);
    expect(result.current.isAnimating).toBe(false);
  });
});

describe("setup step count storage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearStoredStepCount();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    clearStoredStepCount();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("clears the stored count", () => {
    storeStepCount(2);
    clearStoredStepCount();
    expect(getStoredStepCount()).toBeNull();
  });

  it("reads no count when sessionStorage refuses to read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getStoredStepCount()).toBeNull();
  });

  it("follows a count that goes down at once", () => {
    storeStepCount(3);
    const { result, rerender } = renderHook(({ done }) => useSetupProgressOnce(done), {
      initialProps: { done: 3 },
    });
    rerender({ done: 2 });
    expect(result.current.currentValue).toBe(2);
    expect(getStoredStepCount()).toBe(2);
  });

  it("does not save the new count when it unmounts before the fill has played", () => {
    storeStepCount(1);
    const { unmount } = renderHook(() => useSetupProgressOnce(2));
    unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(getStoredStepCount()).toBe(1);
  });
});
