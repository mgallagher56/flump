import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SECTION_COPY,
  WidgetVisibilityPanel,
  type WidgetVisibilityPanelProps,
} from "./WidgetVisibilityPanel";

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
    const debt = screen.getByRole("checkbox", { name: /^Cards and loans/ });
    expect((accounts as HTMLInputElement).checked).toBe(true);
    expect((debt as HTMLInputElement).checked).toBe(false);
  });

  it("reports the toggled key", () => {
    const onToggle = vi.fn();
    render(<WidgetVisibilityPanel {...base({ onToggle })} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Cards and loans/ }));
    expect(onToggle).toHaveBeenCalledWith("debt");
  });

  it("says the rule once and has no jargon in the descriptions", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(
      screen.getAllByText(
        "Choose which sections show on your dashboard. They appear in this order.",
      ),
    ).toHaveLength(1);
    for (const { label, description } of Object.values(SECTION_COPY)) {
      expect(`${label} ${description}`).not.toMatch(/AER|salary sacrifice|0% deal/);
    }
  });

  it("says which ticked sections show on the dashboard", () => {
    render(
      <WidgetVisibilityPanel
        {...base({
          widgetKeys: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
          visibleKeys: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
          shownKeys: ["debt", "savings", "pension", "mortgage"],
        })}
      />,
    );
    expect(screen.getByTestId("widget-visibility-debt-status").textContent).toBe("Showing");
    expect(screen.getByTestId("widget-visibility-accounts-status").textContent).toBe("Not showing");
    expect(screen.getAllByText("Showing")).toHaveLength(4);
    expect(screen.getAllByText("Not showing")).toHaveLength(2);
  });

  it("allows selecting all sections when no cap is set", () => {
    render(
      <WidgetVisibilityPanel
        {...base({
          widgetKeys: ["accounts", "budget", "debt", "savings", "pension"],
          visibleKeys: ["accounts", "budget", "debt", "savings"],
        })}
      />,
    );
    const pension = screen.getByRole("checkbox", { name: /^Pension/ }) as HTMLInputElement;
    expect(pension.disabled).toBe(false);
    expect(
      (screen.getByRole("checkbox", { name: /^Cards and loans/ }) as HTMLInputElement).disabled,
    ).toBe(false);
  });

  it("disables nothing below the cap", () => {
    render(<WidgetVisibilityPanel {...base()} />);
    expect(
      (screen.getByRole("checkbox", { name: /^Cards and loans/ }) as HTMLInputElement).disabled,
    ).toBe(false);
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
