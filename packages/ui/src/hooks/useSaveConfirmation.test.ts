import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveConfirmation } from "./useSaveConfirmation";

describe("useSaveConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is initially not saved", () => {
    const { result } = renderHook(() => useSaveConfirmation());
    expect(result.current.isSaved).toBe(false);
  });

  it("turns saved on trigger, stays for 2 seconds, then resets", () => {
    const onReset = vi.fn();
    const { result } = renderHook(() => useSaveConfirmation({ onReset }));

    act(() => {
      result.current.triggerSaved();
    });
    expect(result.current.isSaved).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.isSaved).toBe(true);
    expect(onReset).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isSaved).toBe(false);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("resets immediately on resetSaved()", () => {
    const onReset = vi.fn();
    const { result } = renderHook(() => useSaveConfirmation({ onReset }));

    act(() => {
      result.current.triggerSaved();
    });
    expect(result.current.isSaved).toBe(true);

    act(() => {
      result.current.resetSaved();
    });
    expect(result.current.isSaved).toBe(false);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("does not reset a second time when the cancelled timer would have run", () => {
    const onReset = vi.fn();
    const { result } = renderHook(() => useSaveConfirmation({ onReset }));
    act(() => {
      result.current.triggerSaved();
    });
    act(() => {
      result.current.resetSaved();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("restarts the window when triggered again", () => {
    const onReset = vi.fn();
    const { result } = renderHook(() => useSaveConfirmation({ onReset }));
    act(() => {
      result.current.triggerSaved();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
      result.current.triggerSaved();
    });
    // The first window would have ended at 2000ms; the second ends at 3500ms.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isSaved).toBe(true);
    expect(onReset).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isSaved).toBe(false);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("works with no onReset callback", () => {
    const { result } = renderHook(() => useSaveConfirmation());
    act(() => {
      result.current.triggerSaved();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isSaved).toBe(false);
    act(() => {
      result.current.triggerSaved();
      result.current.resetSaved();
    });
    expect(result.current.isSaved).toBe(false);
  });

  it("does not call onReset after unmounting", () => {
    const onReset = vi.fn();
    const { result, unmount } = renderHook(() => useSaveConfirmation({ onReset }));
    act(() => {
      result.current.triggerSaved();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onReset).not.toHaveBeenCalled();
  });
});
