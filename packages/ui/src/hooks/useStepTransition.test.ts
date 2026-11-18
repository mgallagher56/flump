import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStepTransition } from "./useStepTransition";

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

describe("useStepTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("returns idle and the initial step on mount", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useStepTransition("step-1", 0));
    expect(result.current.displayedStep).toBe("step-1");
    expect(result.current.animationState).toBe("idle");
    expect(result.current.isTransitioning).toBe(false);
  });

  it("does not animate on re-render with the same step index", () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(({ step, idx }) => useStepTransition(step, idx), {
      initialProps: { step: "step-1", idx: 0 },
    });

    rerender({ step: "step-1", idx: 0 });
    expect(result.current.displayedStep).toBe("step-1");
    expect(result.current.animationState).toBe("idle");
  });

  it("runs enterNext with immediate step swap when advancing forward under motion-safe", () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(({ step, idx }) => useStepTransition(step, idx), {
      initialProps: { step: "step-1", idx: 0 },
    });

    rerender({ step: "step-2", idx: 1 });

    // Step is immediately rendered so input is never delayed
    expect(result.current.displayedStep).toBe("step-2");
    expect(result.current.animationState).toBe("enterNext");
    expect(result.current.isTransitioning).toBe(true);

    // After 200ms (durations.base), enters idle
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.animationState).toBe("idle");
    expect(result.current.isTransitioning).toBe(false);
  });

  it("runs enterBack with immediate step swap when moving backwards under motion-safe", () => {
    mockMatchMedia(false);
    const { result, rerender } = renderHook(({ step, idx }) => useStepTransition(step, idx), {
      initialProps: { step: "step-2", idx: 1 },
    });

    rerender({ step: "step-1", idx: 0 });

    expect(result.current.displayedStep).toBe("step-1");
    expect(result.current.animationState).toBe("enterBack");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.animationState).toBe("idle");
  });

  it("keeps the enter state for a short fade over `fast` under prefers-reduced-motion", () => {
    mockMatchMedia(true);
    const { result, rerender } = renderHook(({ step, idx }) => useStepTransition(step, idx), {
      initialProps: { step: "step-1", idx: 0 },
    });

    rerender({ step: "step-2", idx: 1 });

    // Swaps at once, and the enter state lets the recipe run its reduced-motion fade.
    expect(result.current.displayedStep).toBe("step-2");
    expect(result.current.animationState).toBe("enterNext");

    // The fade lasts `durations.fast` (120ms), not the full `base` arrival.
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(result.current.animationState).toBe("idle");
    expect(result.current.isTransitioning).toBe(false);

    rerender({ step: "step-1", idx: 0 });
    expect(result.current.animationState).toBe("enterBack");
  });
});
