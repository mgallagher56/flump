import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentLoanCalculator } from "./StudentLoanCalculator";

describe("StudentLoanCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<StudentLoanCalculator />);
    expect(container).toBeDefined();
  });

  it("changes the projected outcome content when the salary changes", () => {
    render(<StudentLoanCalculator />);
    const initial = screen.getByTestId("student-loan-tool").textContent;
    fireEvent.change(screen.getByLabelText("Gross annual salary (£)"), {
      target: { value: "120000" },
    });
    expect(screen.getByTestId("student-loan-tool").textContent).not.toBe(initial);
  });

  it("calls onSaveAndContinue with the selected plan", () => {
    const onSave = vi.fn();
    render(<StudentLoanCalculator ctaText="Go" onSaveAndContinue={onSave} />);
    fireEvent.change(screen.getByLabelText("Student loan plan"), { target: { value: "plan5" } });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ studentLoanPlan: "plan5" }));
  });

  it("uses an h2 title and states a projected outcome, not a verdict (R1, R2)", () => {
    render(<StudentLoanCalculator />);
    expect(screen.getByRole("heading", { level: 2, name: /UK student loan/ })).toBeDefined();
    expect(
      screen.getByText(/^Projected outcome: (written off first|repaid before write-off)$/),
    ).toBeDefined();
    expect(screen.queryByText(/verdict|overpay or invest/i)).toBeNull();
  });
});
