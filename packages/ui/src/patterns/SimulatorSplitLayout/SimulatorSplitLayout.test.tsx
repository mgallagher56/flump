import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulatorSplitLayout } from "./SimulatorSplitLayout";

describe("SimulatorSplitLayout Pattern", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("uses a 5/7 split by default and 4/8 when asked", () => {
    const { rerender } = render(
      <SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />,
    );
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain(
      "lg:grid-c_span_5",
    );
    expect(screen.getByRole("region", { name: "Results" }).className).toContain("lg:grid-c_span_7");
    rerender(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        controlsSpan={4}
      />,
    );
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain(
      "lg:grid-c_span_4",
    );
    expect(screen.getByRole("region", { name: "Results" }).className).toContain("lg:grid-c_span_8");
  });

  it("makes the controls sticky from lg", () => {
    render(<SimulatorSplitLayout content={<div>Chart</div>} controls={<div>Controls</div>} />);
    expect(screen.getByRole("region", { name: "Parameters" }).className).toContain("lg:pos_sticky");
  });

  it("shows the summary and an Adjust disclosure wired with aria-expanded and aria-controls", () => {
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        summary={<span>Debt free in 3 years</span>}
      />,
    );
    expect(screen.getByText("Debt free in 3 years")).toBeDefined();
    const adjust = screen.getByRole("button", { name: "Adjust" });
    expect(adjust.getAttribute("aria-expanded")).toBe("false");
    const controls = screen.getByRole("region", { name: "Parameters" });
    expect(adjust.getAttribute("aria-controls")).toBe(controls.id);

    fireEvent.click(adjust);
    expect(adjust.getAttribute("aria-expanded")).toBe("true");
    // The outcome stays rendered while the controls are open.
    expect(screen.getByText("Debt free in 3 years")).toBeDefined();
    expect(screen.getByText("Chart")).toBeDefined();
    fireEvent.click(adjust);
    expect(adjust.getAttribute("aria-expanded")).toBe("false");
  });

  it("supports a custom Adjust label", () => {
    render(
      <SimulatorSplitLayout
        adjustLabel="Change inputs"
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
      />,
    );
    expect(screen.getByRole("button", { name: "Change inputs" })).toBeDefined();
  });

  it("hands the reveal to renderControlsContainer under lg (Sheet swap-in point)", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        renderControlsContainer={({ open, id, label, children }) => (
          <div aria-label={label} data-open={String(open)} id={id} role="dialog">
            {children}
          </div>
        )}
      />,
    );
    const container = screen.getByRole("dialog", { name: "Parameters" });
    expect(container.getAttribute("data-open")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Adjust" }));
    expect(container.getAttribute("data-open")).toBe("true");
  });

  it("keeps the inline controls from lg even with renderControlsContainer", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(
      <SimulatorSplitLayout
        content={<div>Chart</div>}
        controls={<div>Controls</div>}
        renderControlsContainer={() => <div role="dialog">Sheet</div>}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Parameters" })).toBeDefined();
  });
});
