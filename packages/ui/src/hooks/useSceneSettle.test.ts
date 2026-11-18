import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSceneSettled, isSceneSettled, useSceneSettle } from "./useSceneSettle";

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

  it("never claims the scene when disabled, so a later empty state still settles", () => {
    mockMatchMedia(false);
    const off = renderHook(() => useSceneSettle("empty-savings", false));
    expect(off.result.current).toBe(false);
    expect(isSceneSettled("empty-savings")).toBe(false);
    const on = renderHook(() => useSceneSettle("empty-savings"));
    expect(on.result.current).toBe(true);
  });

  it("returns false on subsequent views or re-renders in the same session", () => {
    mockMatchMedia(false);
    const first = renderHook(() => useSceneSettle("empty-accounts"));
    expect(first.result.current).toBe(true);

    const second = renderHook(() => useSceneSettle("empty-accounts"));
    expect(second.result.current).toBe(false);
  });

  it("stays still on a server-rendered page and records the scene as seen", () => {
    mockMatchMedia(false);
    const container = document.body.appendChild(document.createElement("div"));
    const { result } = renderHook(() => useSceneSettle("empty-accounts"), {
      container,
      hydrate: true,
    });
    expect(result.current).toBe(false);
    expect(isSceneSettled("empty-accounts")).toBe(true);
  });

  it("stays still when hydrating under StrictMode's double effect run", () => {
    mockMatchMedia(false);
    const container = document.body.appendChild(document.createElement("div"));
    const { result } = renderHook(() => useSceneSettle("empty-goals"), {
      container,
      hydrate: true,
      wrapper: StrictMode,
    });
    expect(result.current).toBe(false);
  });

  it("settles when a scene first mounts on the client after hydration", () => {
    mockMatchMedia(false);
    const container = document.body.appendChild(document.createElement("div"));
    renderHook(() => useSceneSettle("empty-accounts"), { container, hydrate: true });
    // A client navigation to a page with another scene.
    const { result } = renderHook(() => useSceneSettle("empty-goals"));
    expect(result.current).toBe(true);
  });

  it("still settles on the first view under StrictMode's double effect run", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useSceneSettle("empty-goals"), { wrapper: StrictMode });
    expect(result.current).toBe(true);
  });

  it("stops settling when reduced motion turns on after the first view", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useSceneSettle("empty-budget"));
    expect(result.current).toBe(true);
    act(() => media.set(true));
    expect(result.current).toBe(false);
  });

  it("returns false under prefers-reduced-motion (scene still from the start)", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSceneSettle("empty-accounts"));
    expect(result.current).toBe(false);
  });
});
