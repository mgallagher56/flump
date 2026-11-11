import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GlobalBaselineScenarioBar } from "./GlobalBaselineScenarioBar";

describe("GlobalBaselineScenarioBar", () => {
  it("expands scenario details, adjusts salary/pension/sacrifice overrides, resets, and commits", () => {
    render(<GlobalBaselineScenarioBar />);

    const expandBtn = screen.getByRole("button", { name: /Update details/i });
    fireEvent.click(expandBtn);

    expect(screen.getByRole("button", { name: /Hide details/i })).toBeTruthy();

    const salaryInput = screen.getByLabelText("Gross Annual Salary");
    fireEvent.change(salaryInput, { target: { value: "85000" } });

    expect(screen.getByText("What-If Active")).toBeTruthy();

    const pensionInput = screen.getByLabelText("Pension Contribution");
    fireEvent.change(pensionInput, { target: { value: "10" } });

    const sacrificeCheckbox = screen.getByRole("checkbox");
    fireEvent.click(sacrificeCheckbox);

    // Commit scenario
    const commitBtn = screen.getByRole("button", { name: /Commit to Profile/i });
    fireEvent.click(commitBtn);

    // Re-trigger scenario and reset
    fireEvent.change(salaryInput, { target: { value: "90000" } });
    const resetBtn = screen.getByRole("button", { name: /Reset/i });
    fireEvent.click(resetBtn);
  });
});
