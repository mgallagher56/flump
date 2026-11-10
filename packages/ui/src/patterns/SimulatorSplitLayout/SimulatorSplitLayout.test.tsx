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
});
