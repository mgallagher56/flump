import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import usePrefersReducedMotion from "./usePrefersReducedMotion";

const mockMatchMedia = (initial: boolean) => {
  let listener: (() => void) | undefined;
  const media = {
    matches: initial,
    addEventListener: vi.fn((_: string, cb: () => void) => {
      listener = cb;
    }),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn().mockReturnValue(media) as unknown as typeof window.matchMedia;
  return {
    change: (next: boolean) => {
      media.matches = next;
      listener?.();
    },
  };
};

describe("usePrefersReducedMotion", () => {
  afterEach(() => vi.restoreAllMocks());

  test("returns false when the user has no preference", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  test("returns true when reduced motion is requested", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  test("is false in the server HTML, before the preference is read", () => {
    mockMatchMedia(true);
    const seen: boolean[] = [];
    renderHook(() => {
      const value = usePrefersReducedMotion();
      seen.push(value);
      return value;
    });
    expect(seen[0]).toBe(false);
  });

  test("stays false without error where the browser has no matchMedia", () => {
    const original = window.matchMedia;
    // Simulates a browser without matchMedia.
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    try {
      const { result } = renderHook(() => usePrefersReducedMotion());
      expect(result.current).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });

  test("stops listening when unmounted", () => {
    const remove = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: remove,
    }) as unknown as typeof window.matchMedia;
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    unmount();
    expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
  });

  test("updates when the preference changes", () => {
    const mm = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    act(() => mm.change(true));
    expect(result.current).toBe(true);
  });
});
