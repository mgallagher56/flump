import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WidgetVisibilityPanel, type WidgetVisibilityPanelProps } from "./WidgetVisibilityPanel";

const base = (over: Partial<WidgetVisibilityPanelProps> = {}): WidgetVisibilityPanelProps => ({
  open: true,
  onOpenChange: vi.fn(),
  widgetKeys: ["accounts", "budget", "debt"],
  visibleKeys: ["accounts", "budget"],
  onToggle: vi.fn(),
  error: null,
  ...over,
});

describe("<WidgetVisibilityPanel />", () => {
  it("lists each widget as a checkbox reflecting its visibility", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(screen.getByRole("dialog", { name: "Show or hide widgets" })).toBeDefined();
    const accounts = screen.getByRole("checkbox", { name: /^Accounts/ });
    const debt = screen.getByRole("checkbox", { name: /^Debt/ });
    expect((accounts as HTMLInputElement).checked).toBe(true);
    expect((debt as HTMLInputElement).checked).toBe(false);
  });

  it("reports the toggled key", () => {
    const onToggle = vi.fn();
    render(<WidgetVisibilityPanel {...base({ onToggle })} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Debt/ }));
    expect(onToggle).toHaveBeenCalledWith("debt");
  });

  it("shows a save error inline", () => {
    render(<WidgetVisibilityPanel {...base({ error: "Could not save." })} />);
    expect(screen.getByRole("alert").textContent).toBe("Could not save.");
  });

  it("closes from the Done button", () => {
    const onOpenChange = vi.fn();
    render(<WidgetVisibilityPanel {...base({ onOpenChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
