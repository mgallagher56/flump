import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useThemeContext } from "./ThemeContext";

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns default value when used outside provider", () => {
    const { result } = renderHook(() => useThemeContext());
    expect(result.current.theme).toBe("light");
  });

  it("initializes from localStorage if set to dark", () => {
    localStorage.setItem("flump-theme", "dark");
    const { result } = renderHook(() => useThemeContext(), {
      wrapper: ThemeProvider,
    });
    expect(result.current.theme).toBe("dark");
  });

  it("initializes from matchMedia if localStorage is empty", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    const { result } = renderHook(() => useThemeContext(), {
      wrapper: ThemeProvider,
    });
    expect(result.current.theme).toBe("dark");

    window.matchMedia = originalMatchMedia;
  });

  it("allows setting theme directly", () => {
    const { result } = renderHook(() => useThemeContext(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("flump-theme")).toBe("dark");

    act(() => {
      result.current.setTheme("light");
    });
    expect(result.current.theme).toBe("light");
  });
});
