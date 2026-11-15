import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSceneSettled, useSceneSettle } from "./useSceneSettle";

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

describe("useSceneSettle", () => {
  beforeEach(() => {
    clearSceneSettled();
  });

  afterEach(() => {
    clearSceneSettled();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("returns true on the first view in a session under motion-safe", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useSceneSettle("empty-accounts"));
    expect(result.current).toBe(true);
  });

  it("returns false on subsequent views or re-renders in the same session", () => {
    mockMatchMedia(false);
    const first = renderHook(() => useSceneSettle("empty-accounts"));
    expect(first.result.current).toBe(true);

    const second = renderHook(() => useSceneSettle("empty-accounts"));
    expect(second.result.current).toBe(false);
  });

  it("returns false under prefers-reduced-motion (scene still from the start)", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSceneSettle("empty-accounts"));
    expect(result.current).toBe(false);
  });
});
