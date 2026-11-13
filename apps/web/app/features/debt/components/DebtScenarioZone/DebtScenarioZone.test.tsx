import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { DebtScenarioZone } from "./DebtScenarioZone";

const basis = "Starting from your figures: £8,400 owed across 2 debts, £240 a month in minimums";

describe("DebtScenarioZone", () => {
  it("is a labelled section with the not-saved badge, notice and basis line", () => {
    customRender(
      <DebtScenarioZone basis={basis} isModified={false} onReset={vi.fn()}>
        <p>tools</p>
      </DebtScenarioZone>,
    );
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    expect(zone.textContent).toContain("Illustration, not saved");
    expect(zone.textContent).toContain(basis);
    expect(screen.getByLabelText("Guidance, not advice")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  });

  it("shows Reset only when modified and calls onReset", () => {
    const onReset = vi.fn();
    customRender(
      <DebtScenarioZone basis={basis} isModified onReset={onReset}>
        <p>tools</p>
      </DebtScenarioZone>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
