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
    expect(screen.getByRole("dialog", { name: "Choose what shows here" })).toBeDefined();
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

  it("disables the unticked boxes with one hint once four sections are ticked", () => {
    render(
      <WidgetVisibilityPanel
        {...base({
          widgetKeys: ["accounts", "budget", "debt", "savings", "pension"],
          visibleKeys: ["accounts", "budget", "debt", "savings"],
        })}
      />,
    );
    const pension = screen.getByRole("checkbox", { name: /^Pension/ }) as HTMLInputElement;
    expect(pension.disabled).toBe(true);
    expect(pension.getAttribute("aria-describedby")).toBe("widget-visibility-cap");
    expect(screen.getAllByText("Up to 4 sections show here.")).toHaveLength(1);
    // Ticked boxes stay usable, so a section can be swapped out.
    expect((screen.getByRole("checkbox", { name: /^Debt/ }) as HTMLInputElement).disabled).toBe(
      false,
    );
  });

  it("shows no hint and disables nothing below the cap", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(screen.queryByText(/Up to 4 sections/)).toBeNull();
    expect((screen.getByRole("checkbox", { name: /^Debt/ }) as HTMLInputElement).disabled).toBe(
      false,
    );
  });

  it("shows a save error inline", () => {
    render(<WidgetVisibilityPanel {...base({ error: "Could not save." })} />);
    expect(screen.getByRole("alert").textContent).toContain("Could not save.");
  });

  it("closes from the Done button", () => {
    const onOpenChange = vi.fn();
    render(<WidgetVisibilityPanel {...base({ onOpenChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
