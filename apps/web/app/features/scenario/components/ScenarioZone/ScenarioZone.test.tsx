import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScenarioZone } from "./ScenarioZone";

describe("<ScenarioZone />", () => {
  it("labels the region and says the figures are not saved", () => {
    render(
      <ScenarioZone title="Model a change to your pay" basis="£62,000 gross salary">
        <p>tool</p>
      </ScenarioZone>,
    );
    expect(screen.getByRole("region", { name: "Model a change to your pay" })).toBeDefined();
    expect(screen.getByText("Illustration, not saved")).toBeDefined();
    expect(screen.getByText(/Starting from your figures: £62,000 gross salary/)).toBeDefined();
  });

  it("only enables the reset button once something has changed", () => {
    const onReset = vi.fn();
    const { rerender } = render(
      <ScenarioZone title="Model a change to your pay" onReset={onReset}>
        <p>tool</p>
      </ScenarioZone>,
    );
    const reset = screen.getByRole("button", {
      name: "Reset to saved figures",
    }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    rerender(
      <ScenarioZone title="Model a change to your pay" isModified onReset={onReset}>
        <p>tool</p>
      </ScenarioZone>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
