import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useThemePreference as useTheme } from "./useThemePreference";

describe("useThemePreference", () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset document element classList and attribute
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");

    // Setup matchMedia mock (defaults to light mode)
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("initializes with light mode by default if localStorage is empty and system theme is light", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("initializes with light mode if localStorage has light", () => {
    localStorage.setItem("flump-theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("initializes with light mode if system prefers light and no localStorage", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: query !== "(prefers-color-scheme: dark)",
      })),
    );
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("initializes with dark mode if system prefers dark and no localStorage", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
      })),
    );
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("toggleTheme toggles the theme, updates class, and saves to localStorage", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("flump-theme")).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("flump-theme")).toBe("light");
  });

  test("setTheme sets the specified theme", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("flump-theme")).toBe("dark");

    act(() => {
      result.current.setTheme("light");
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("flump-theme")).toBe("light");
  });
  test("setPreference('system') clears the override and follows the system theme", () => {
    localStorage.setItem("flump-theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe("dark");

    act(() => {
      result.current.setPreference("system");
    });

    expect(result.current.preference).toBe("system");
    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem("flump-theme")).toBeNull();
  });

  test("follows live system changes only while the preference is system", () => {
    let listener: ((event: { matches: boolean }) => void) | undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => {
          listener = fn;
        },
        removeEventListener: vi.fn(),
      })),
    );
    const { result } = renderHook(() => useTheme());
    act(() => listener?.({ matches: true }));
    expect(result.current.theme).toBe("dark");

    act(() => result.current.setPreference("light"));
    act(() => listener?.({ matches: true }));
    expect(result.current.theme).toBe("light");
  });

  test("first render uses the server default, then syncs the stored preference", () => {
    localStorage.setItem("flump-theme", "light");
    const themes: string[] = [];
    const { result } = renderHook(() => {
      const value = useTheme();
      themes.push(value.theme);
      return value;
    });
    expect(themes[0]).toBe("dark");
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
