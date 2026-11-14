import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import useIsMobile, { NAV_COLLAPSED_MEDIA_QUERY } from "./useIsMobile";

function stubViewport(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns false when matchMedia is unavailable", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  test("first render is false even on a narrow viewport, so it matches server HTML", () => {
    stubViewport(true);
    const renders: boolean[] = [];
    renderHook(() => {
      const value = useIsMobile();
      renders.push(value);
      return value;
    });
    expect(renders[0]).toBe(false);
  });

  test("follows the shared nav breakpoint (48rem, 768px: phones only)", () => {
    expect(NAV_COLLAPSED_MEDIA_QUERY).toBe("not all and (min-width: 48rem)");
    stubViewport(true);
    renderHook(() => useIsMobile());
    expect(window.matchMedia).toHaveBeenCalledWith(NAV_COLLAPSED_MEDIA_QUERY);
  });

  test("syncs to true after mount on a narrow viewport", () => {
    stubViewport(true);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
