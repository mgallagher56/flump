import { renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { safeRedirect, useMatchesData, validateEmail } from "./utils";

const matches = vi.hoisted(() => ({
  current: [{ id: "home", data: { page: "first" } }] as { id: string; data: unknown }[],
}));

vi.mock("react-router", () => ({ useMatches: () => matches.current }));

describe("safeRedirect with a file upload", () => {
  test("returns the default redirect for a form value that is not text", () => {
    const file = new File(["/app"], "redirect.txt");
    expect(safeRedirect(file)).toBe("/");
  });
});

describe("validateEmail length", () => {
  test("needs more than three characters", () => {
    expect(validateEmail("a@b")).toBe(false);
    expect(validateEmail("a@bc")).toBe(true);
  });
});

describe("useMatchesData after navigation", () => {
  test("returns the new route data when the matches change", () => {
    matches.current = [{ id: "home", data: { page: "first" } }];
    const { result, rerender } = renderHook(() => useMatchesData("home"));
    expect(result.current).toEqual({ page: "first" });

    matches.current = [{ id: "home", data: { page: "second" } }];
    rerender();
    expect(result.current).toEqual({ page: "second" });
  });
});
