import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SimulatorSplitLayout } from "./SimulatorSplitLayout";

describe("SimulatorSplitLayout Pattern", () => {
  it("renders sticky left controls and right visual content", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Visual Area Chart</div>}
        controls={<div>Slider Parameters</div>}
      />,
    );
    expect(screen.getByText("Slider Parameters")).toBeDefined();
    expect(screen.getByText("Visual Area Chart")).toBeDefined();
  });

  it("renders no main landmark", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    expect(screen.queryByRole("main")).toBeNull();
  });

  it("labels both regions with defaults", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    expect(screen.getByRole("region", { name: "Parameters" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Results" })).toBeDefined();
  });

  it("accepts custom region labels", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        contentLabel="Payoff outcome"
        controls={<div>Controls</div>}
        controlsLabel="Payoff inputs"
      />,
    );
    expect(screen.getByRole("region", { name: "Payoff inputs" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Payoff outcome" })).toBeDefined();
  });
});
