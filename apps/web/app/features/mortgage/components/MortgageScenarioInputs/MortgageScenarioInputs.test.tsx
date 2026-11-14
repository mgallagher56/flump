import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageScenarioInputs } from "./MortgageScenarioInputs";

const values = { loanAmount: 180000, interestRate: 4.5, remainingTerm: 20 };

describe("<MortgageScenarioInputs />", () => {
  it("renders the three starting figures and says they only change the illustration", () => {
    render(<MortgageScenarioInputs isEdited={() => false} values={values} onChange={vi.fn()} />);
    expect(screen.getByText(/only changes the illustration/i)).toBeDefined();
    expect(screen.queryByText(/Changed from your saved figure/)).toBeNull();
  });

  it("shows a stored term as years and months and a rate as entered", () => {
    render(
      <MortgageScenarioInputs
        isEdited={() => false}
        values={{ loanAmount: 186000, interestRate: 4.5, remainingTerm: 218 / 12 }}
        onChange={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Years left to try input") as HTMLInputElement).value).toBe("18");
    expect((screen.getByLabelText("Months input") as HTMLInputElement).value).toBe("2");
    expect(document.body.textContent).not.toContain("18.17");
    expect((screen.getByLabelText("Rate to try input") as HTMLInputElement).value).toBe("4.5%");
  });

  it("edits the term in whole months, keeping it to at least 1 month", () => {
    const onChange = vi.fn();
    render(
      <MortgageScenarioInputs
        isEdited={() => false}
        values={{ ...values, remainingTerm: 218 / 12 }}
        onChange={onChange}
      />,
    );
    fireEvent.keyDown(screen.getByRole("slider", { name: "Months" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("remainingTerm", 219 / 12);
    fireEvent.keyDown(screen.getByRole("slider", { name: "Years left to try" }), {
      key: "ArrowLeft",
    });
    expect(onChange).toHaveBeenLastCalledWith("remainingTerm", 206 / 12);
    fireEvent.keyDown(screen.getByRole("slider", { name: "Years left to try" }), { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("remainingTerm", 2 / 12);
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
