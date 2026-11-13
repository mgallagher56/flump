import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageScenarioInputs } from "./MortgageScenarioInputs";

const values = { loanAmount: 180000, interestRate: 4.5, remainingTerm: 20 };

describe("<MortgageScenarioInputs />", () => {
  it("renders the three starting figures and says they only change the illustration", () => {
    render(<MortgageScenarioInputs isEdited={() => false} values={values} onChange={vi.fn()} />);
    expect(screen.getByText(/only change the illustration/i)).toBeDefined();
    expect(screen.queryByText(/Changed from your saved figure/)).toBeNull();
  });

  it("marks an edited input in words", () => {
    render(
      <MortgageScenarioInputs
        isEdited={(k) => k === "interestRate"}
        values={values}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Changed from your saved figure")).toHaveLength(1);
  });

  it("reports a changed slider value", () => {
    const onChange = vi.fn();
    render(<MortgageScenarioInputs isEdited={() => false} values={values} onChange={onChange} />);
    const sliders = screen.getAllByRole("slider");
    fireEvent.keyDown(sliders[1] as HTMLElement, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalled();
  });
});
