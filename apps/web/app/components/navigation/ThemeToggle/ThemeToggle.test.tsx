import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { ThemePreference } from "~/hooks/useTheme";
import { ThemeContext } from "~/ThemeContext";
import customRender from "~/testUtils/customRender";
import ThemeToggle from "./ThemeToggle";
import { themeToggleOption } from "./ThemeToggle.styles";

function renderToggle(preference: ThemePreference) {
  const setPreference = vi.fn();
  customRender(
    <ThemeContext.Provider
      value={{
        theme: preference === "dark" ? "dark" : "light",
        preference,
        setPreference,
        toggleTheme: vi.fn(),
      }}
    >
      <ThemeToggle />
    </ThemeContext.Provider>,
  );
  return setPreference;
}

describe("<ThemeToggle />", () => {
  test("offers system, light and dark options and marks the current preference", () => {
    renderToggle("system");
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "System theme" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Dark theme" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  test("selecting an option sets that preference", () => {
    const setPreference = renderToggle("system");
    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(setPreference).toHaveBeenCalledWith("dark");
    fireEvent.click(screen.getByRole("button", { name: "System theme" }));
    expect(setPreference).toHaveBeenCalledWith("system");
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
