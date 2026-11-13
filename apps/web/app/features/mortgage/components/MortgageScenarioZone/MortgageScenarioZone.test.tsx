import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageScenarioZone } from "./MortgageScenarioZone";

describe("<MortgageScenarioZone />", () => {
  it("is a labelled section with the not-saved badge and a projection notice", () => {
    render(<MortgageScenarioZone basis="Starting from your figures">tool</MortgageScenarioZone>);
    const section = screen.getByRole("region", { name: "Model a change to your mortgage" });
    expect(section).toBeDefined();
    expect(screen.getByText("Illustration, not saved")).toBeDefined();
    expect(screen.getByLabelText("Guidance, not advice")).toBeDefined();
    expect(screen.getByText("Starting from your figures")).toBeDefined();
  });

  it("offers reset only once modified", () => {
    const onReset = vi.fn();
    const { rerender } = render(<MortgageScenarioZone onReset={onReset} />);
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
    rerender(<MortgageScenarioZone isModified onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("announces outcomes with the Illustration prefix", async () => {
    render(<MortgageScenarioZone announcement="Interest saved £1,000" />);
    expect(await screen.findByText("Illustration: Interest saved £1,000")).toBeDefined();
  });
});
