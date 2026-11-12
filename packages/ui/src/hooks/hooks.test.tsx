import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChartAnimation, usePrefersReducedMotion } from "./index";

type Listener = () => void;

function mockMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((_: string, l: Listener) => listeners.add(l)),
    removeEventListener: vi.fn((_: string, l: Listener) => listeners.delete(l)),
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

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "matchMedia");
});

describe("usePrefersReducedMotion", () => {
  it("returns false when matchMedia is undefined (SSR-like)", () => {
    Reflect.deleteProperty(window, "matchMedia");
    vi.stubGlobal("matchMedia", undefined);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("reads the initial preference", () => {
    mockMatchMedia(true);
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true);
  });

  it("updates on change events and unsubscribes on unmount", () => {
    const m = mockMatchMedia(false);
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => m.set(true));
    expect(result.current).toBe(true);
    act(() => m.set(false));
    expect(result.current).toBe(false);
    unmount();
    expect(m.mql.removeEventListener).toHaveBeenCalled();
  });
});

describe("useChartAnimation", () => {
  it("is true by default", () => {
    mockMatchMedia(false);
    expect(renderHook(() => useChartAnimation()).result.current).toBe(true);
  });

  it("is false while dragging", () => {
    mockMatchMedia(false);
    expect(renderHook(() => useChartAnimation({ isDragging: true })).result.current).toBe(false);
  });

  it("is false under reduced motion, and reacts to changes", () => {
    const m = mockMatchMedia(true);
    const { result } = renderHook(() => useChartAnimation());
    expect(result.current).toBe(false);
    act(() => m.set(false));
    expect(result.current).toBe(true);
  });
});
