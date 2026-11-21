import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSceneSettled,
  isSceneSettled,
  markSceneSettled,
  useSceneSettle,
} from "./useSceneSettle";

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

describe("scene settled storage", () => {
  beforeEach(() => {
    clearSceneSettled();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearSceneSettled();
    sessionStorage.clear();
  });

  it("records a settled scene in sessionStorage under its prefixed key", () => {
    markSceneSettled("net-worth");
    expect(sessionStorage.getItem("flump.scene-settled.net-worth")).toBe("1");
  });

  it("reads a scene settled earlier in the visit from sessionStorage", () => {
    sessionStorage.setItem("flump.scene-settled.budget", "1");
    expect(isSceneSettled("budget")).toBe(true);
    expect(isSceneSettled("goals")).toBe(false);
  });

  /** Replaces sessionStorage for one test; the returned function puts the real one back. */
  const replaceSessionStorage = (fake: Partial<Storage> | undefined) => {
    const own = Object.getOwnPropertyDescriptor(window, "sessionStorage");
    Object.defineProperty(window, "sessionStorage", { value: fake, configurable: true });
    return () => {
      if (own) Object.defineProperty(window, "sessionStorage", own);
      else Reflect.deleteProperty(window, "sessionStorage");
    };
  };

  it("remembers a scene in memory when sessionStorage refuses to write", () => {
    const restore = replaceSessionStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    try {
      markSceneSettled("debts");
      expect(isSceneSettled("debts")).toBe(true);
    } finally {
      restore();
    }
  });

  it("treats a scene as not settled when sessionStorage refuses to read", () => {
    const restore = replaceSessionStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    try {
      expect(isSceneSettled("pension")).toBe(false);
    } finally {
      restore();
    }
  });

  it("treats a scene as not settled when there is no sessionStorage", () => {
    const restore = replaceSessionStorage(undefined);
    try {
      expect(isSceneSettled("pension")).toBe(false);
    } finally {
      restore();
    }
  });

  it("clears only its own keys", () => {
    sessionStorage.setItem("other.key", "kept");
    markSceneSettled("budget");
    clearSceneSettled();
    expect(sessionStorage.getItem("flump.scene-settled.budget")).toBeNull();
    expect(sessionStorage.getItem("other.key")).toBe("kept");
  });

  it("stops settling when the scene changes to one already seen", () => {
    markSceneSettled("seen");
    const { result, rerender } = renderHook(({ key }) => useSceneSettle(key), {
      initialProps: { key: "fresh" },
    });
    expect(result.current).toBe(true);
    rerender({ key: "seen" });
    expect(result.current).toBe(false);
  });
});
