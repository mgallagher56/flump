import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { ThemePreference } from "../../hooks/useThemePreference";
import { ThemeToggle } from "./ThemeToggle";
import { themeToggleCycle, themeToggleOption } from "./ThemeToggle.styles";

function renderToggle(preference: ThemePreference) {
  const onChange = vi.fn();
  render(<ThemeToggle preference={preference} onChange={onChange} />);
  return onChange;
}

describe("<ThemeToggle />", () => {
  test("offers system, light and dark options and marks the current preference", () => {
    renderToggle("system");
    expect(screen.getByRole("group", { name: "Colour theme" })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "System theme" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Dark theme" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  test("selecting an option reports that preference", () => {
    const onChange = renderToggle("system");
    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(onChange).toHaveBeenCalledWith("dark");
    fireEvent.click(screen.getByRole("button", { name: "System theme" }));
    expect(onChange).toHaveBeenCalledWith("system");
  });
});

describe("ThemeToggle touch targets", () => {
  test("options are at least 44px on small screens and compact from md up", () => {
    const raw = themeToggleOption.raw() as {
      width: { base: string; md: string };
      height: { base: string; md: string };
    };
    expect(raw.width.base).toBe("44px");
    expect(raw.height.base).toBe("44px");
    expect(raw.width.md).toBe("32px");
  });
});

describe("ThemeToggle cycle variant", () => {
  test("is one button naming the current choice that moves to the next", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ThemeToggle onChange={onChange} preference="system" variant="cycle" />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Colour theme: system. Change to light" }));
    expect(onChange).toHaveBeenLastCalledWith("light");
    rerender(<ThemeToggle onChange={onChange} preference="dark" variant="cycle" />);
    fireEvent.click(screen.getByRole("button", { name: "Colour theme: dark. Change to system" }));
    expect(onChange).toHaveBeenLastCalledWith("system");
  });

  test("is a 44px touch target at every width", () => {
    const raw = themeToggleCycle.raw() as { width: string; height: string };
    expect(raw.width).toBe("44px");
    expect(raw.height).toBe("44px");
  });
});
