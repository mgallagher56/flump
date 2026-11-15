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
});
