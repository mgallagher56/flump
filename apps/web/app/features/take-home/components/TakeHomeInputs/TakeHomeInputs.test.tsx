import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TakeHomeInputs, type TakeHomeInputsProps } from "./TakeHomeInputs";

const setup = (overrides: Partial<TakeHomeInputsProps> = {}) => {
  const props: TakeHomeInputsProps = {
    grossSalary: 45000,
    pensionPercent: 5,
    isSalarySacrifice: true,
    isSalarySacrificeEmployerNi: false,
    studentLoanPlan: "none",
    studentLoanPlans: [{ key: "plan2", name: "Plan 2", threshold: 29385 }],
    onGrossSalaryChange: vi.fn(),
    onPensionPercentChange: vi.fn(),
    onSalarySacrificeChange: vi.fn(),
    onEmployerNiChange: vi.fn(),
    onStudentLoanPlanChange: vi.fn(),
    ...overrides,
  };
  render(<TakeHomeInputs {...props} />);
  return props;
};

describe("<TakeHomeInputs />", () => {
  it("shows the salary as unset, not an invented figure, when it is unknown", () => {
    setup({ grossSalary: 0 });
    const slider = screen.getByLabelText("Gross salary range slider");
    expect(slider.getAttribute("aria-valuetext")).toBe("Not set");
  });

  it("reports slider, switch and select changes", () => {
    const props = setup();
    fireEvent.change(screen.getByLabelText("Gross salary range slider"), {
      target: { value: "60000" },
    });
    expect(props.onGrossSalaryChange).toHaveBeenCalledWith(60000);
    fireEvent.change(screen.getByLabelText("Pension contribution range slider"), {
      target: { value: "8" },
    });
    expect(props.onPensionPercentChange).toHaveBeenCalledWith(8);
    fireEvent.click(screen.getByRole("switch", { name: /Salary sacrifice/ }));
    expect(props.onSalarySacrificeChange).toHaveBeenCalledWith(false);
    fireEvent.change(screen.getByLabelText("Student loan plan"), { target: { value: "plan2" } });
    expect(props.onStudentLoanPlanChange).toHaveBeenCalledWith("plan2");
  });

  it("lists the student loan thresholds in en-GB", () => {
    setup();
    const options = Array.from(screen.getByRole("combobox").querySelectorAll("option")).map(
      (o) => o.textContent,
    );
    expect(options).toContain("Plan 2, threshold £29,385");
  });

  it("disables passing on employer NI until salary sacrifice is on", () => {
    setup({ isSalarySacrifice: false });
    const employerNi = screen.getByRole("switch", { name: /Pass on employer NI/ });
    expect((employerNi as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Requires salary sacrifice")).toBeDefined();
  });
});
