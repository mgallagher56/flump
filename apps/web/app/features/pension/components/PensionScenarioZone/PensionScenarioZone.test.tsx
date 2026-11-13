import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PensionScenarioZone } from "./PensionScenarioZone";

describe("<PensionScenarioZone />", () => {
  it("is a labelled section with the illustration badge, notice and basis line", () => {
    render(
      <PensionScenarioZone basis="£50,000 salary" isModified={false} onReset={vi.fn()}>
        <p>inside</p>
      </PensionScenarioZone>,
    );
    const zone = screen.getByRole("region", { name: "Model a change to your pension" });
    expect(zone.tagName).toBe("SECTION");
    expect(zone.textContent).toContain("Illustration, not saved");
    expect(zone.textContent).toContain("Starting from your figures: £50,000 salary");
    expect(screen.getByRole("complementary", { name: "Guidance, not advice" })).toBeDefined();
    expect(screen.getByText("inside")).toBeDefined();
  });

  it("shows Reset to saved figures only when modified, and calls onReset", () => {
    const onReset = vi.fn();
    const { rerender } = render(
      <PensionScenarioZone isModified={false} onReset={onReset}>
        x
      </PensionScenarioZone>,
    );
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
    rerender(
      <PensionScenarioZone isModified onReset={onReset}>
        x
      </PensionScenarioZone>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("offers Update your details only when a handler is given", () => {
    const onEdit = vi.fn();
    render(
      <PensionScenarioZone isModified={false} onEditDetails={onEdit} onReset={vi.fn()}>
        x
      </PensionScenarioZone>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Update your details" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
