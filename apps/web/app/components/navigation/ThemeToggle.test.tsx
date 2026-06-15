import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ThemeContext } from "~/ThemeContext";
import customRender from "~/testUtils/customRender";
import ThemeToggle from "./ThemeToggle";

describe("<ThemeToggle />", () => {
  test("renders sun icon when theme is dark", () => {
    const toggleThemeMock = vi.fn();
    customRender(
      <ThemeContext.Provider value={{ theme: "dark", toggleTheme: toggleThemeMock }}>
        <ThemeToggle />
      </ThemeContext.Provider>,
    );

    const button = screen.getByRole("button", { name: /switch to light mode/i });
    expect(button).toBeDefined();
    expect(button.querySelector("svg")).toBeTruthy();
  });

  test("renders moon icon when theme is light", () => {
    const toggleThemeMock = vi.fn();
    customRender(
      <ThemeContext.Provider value={{ theme: "light", toggleTheme: toggleThemeMock }}>
        <ThemeToggle />
      </ThemeContext.Provider>,
    );

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(button).toBeDefined();
    expect(button.querySelector("svg")).toBeTruthy();
  });

  test("calls toggleTheme when clicked", () => {
    const toggleThemeMock = vi.fn();
    customRender(
      <ThemeContext.Provider value={{ theme: "dark", toggleTheme: toggleThemeMock }}>
        <ThemeToggle />
      </ThemeContext.Provider>,
    );

    const button = screen.getByRole("button", { name: /switch to light mode/i });
    fireEvent.click(button);

    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });
});
