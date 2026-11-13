import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

describe("useUnsavedChangesGuard", () => {
  it("runs an action straight away when nothing is unsaved", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(false));
    const action = vi.fn();
    act(() => result.current.guard(action));
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toBe(false);
  });

  it("holds an action while dirty until the person discards", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const action = vi.fn();
    act(() => result.current.guard(action));
    expect(action).not.toHaveBeenCalled();
    expect(result.current.blocked).toBe(true);
    act(() => result.current.proceed());
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.blocked).toBe(false);
  });

  it("drops the held action when the person keeps editing", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const action = vi.fn();
    act(() => result.current.guard(action));
    act(() => result.current.stay());
    expect(action).not.toHaveBeenCalled();
    expect(result.current.blocked).toBe(false);
  });
});
