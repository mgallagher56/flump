import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDelayedPending } from "./useDelayedPending";

describe("useDelayedPending", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays false for a wait shorter than the delay", () => {
    const { result, rerender } = renderHook(({ pending }) => useDelayedPending(pending), {
      initialProps: { pending: true },
    });
    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe(false);
    rerender({ pending: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it("turns true after the delay and stays for the minimum once the wait ends", () => {
    const { result, rerender } = renderHook(({ pending }) => useDelayedPending(pending), {
      initialProps: { pending: true },
    });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    rerender({ pending: false });
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(false);
  });

  it("stays shown when pending turns back on during the minimum", () => {
    const { result, rerender } = renderHook(({ pending }) => useDelayedPending(pending), {
      initialProps: { pending: true },
    });
    act(() => vi.advanceTimersByTime(200));
    rerender({ pending: false });
    act(() => vi.advanceTimersByTime(100));
    rerender({ pending: true });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(true);
  });

  it("takes custom timings", () => {
    const { result } = renderHook(() => useDelayedPending(true, { delayMs: 50 }));
    act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe(true);
  });
});
