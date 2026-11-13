import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentLoanCalculator } from "./StudentLoanCalculator";

describe("StudentLoanCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<StudentLoanCalculator />);
    expect(container).toBeDefined();
  });

  it("changes the verdict content when the salary changes", () => {
    render(<StudentLoanCalculator />);
    const initial = screen.getByTestId("student-loan-tool").textContent;
    fireEvent.change(screen.getByLabelText("Annual Salary"), { target: { value: "120000" } });
    expect(screen.getByTestId("student-loan-tool").textContent).not.toBe(initial);
  });

  it("calls onSaveAndContinue with the selected plan", () => {
    const onSave = vi.fn();
    render(<StudentLoanCalculator ctaText="Go" onSaveAndContinue={onSave} />);
    fireEvent.change(screen.getByLabelText("Student Loan Plan"), { target: { value: "plan5" } });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ studentLoanPlan: "plan5" }));
  });
});
