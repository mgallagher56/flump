import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("renders with light mode by default and allows toggling to dark mode", () => {
    localStorage.clear();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(button).toBeDefined();

    // Click to switch to dark mode
    fireEvent.click(button);

    // Should now toggle to 'Switch to light mode'
    expect(screen.getByRole("button", { name: /switch to light mode/i })).toBeDefined();
    expect(localStorage.getItem("flump-theme")).toBe("dark");

    // Click again to switch back
    fireEvent.click(screen.getByRole("button", { name: /switch to light mode/i }));
    expect(localStorage.getItem("flump-theme")).toBe("light");
  });
});
