import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

const mockSubmit = vi.fn();
vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
  }),
}));

import PensionQuickStartWizard from "./PensionQuickStartWizard";

describe("PensionQuickStartWizard", () => {
  it("progresses through 3 steps and submits correctly", () => {
    const onComplete = vi.fn();
    render(
      <PensionQuickStartWizard
        initialEmployeePercent={5.0}
        initialEmployerPercent={3.0}
        initialSalary={45000}
        onComplete={onComplete}
      />,
    );

    // Step 1: Salary & Contributions
    expect(screen.getByText("Confirm your salary & contribution rates")).toBeDefined();
    expect(screen.getByLabelText("Annual Salary (£)")).toBeDefined();
    expect(screen.getByLabelText(/Salary Sacrifice/i)).toBeDefined();
    const employerNiCheckbox = screen.getByLabelText(/Pass on Employer NI/i);
    expect(employerNiCheckbox).toBeDefined();
    fireEvent.click(employerNiCheckbox);

    // Click Next -> Step 2: Add Existing Pot
    fireEvent.click(screen.getByText(/Next/i));
    expect(screen.getByText("Add your current pension pot")).toBeDefined();
    expect(screen.getByLabelText("Pension Provider / Pot Name")).toBeDefined();

    // Click Next -> Step 3: Outlook & Summary
    fireEvent.click(screen.getByText(/Next/i));
    expect(screen.getByText("Your 25-Year Retirement Outlook")).toBeDefined();
    expect(screen.getByText(/POT VALUE IN 25 YEARS/i)).toBeDefined();

    // Click Save & Start Tracking
    fireEvent.click(screen.getByText(/Save & Start Tracking/i));
    expect(mockSubmit).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it("starts with an empty salary instead of assuming £45,000 when none is stored", () => {
    render(<PensionQuickStartWizard initialSalary={null} onComplete={vi.fn()} />);
    expect((screen.getByLabelText("Annual Salary (£)") as HTMLInputElement).value).toBe("");
  });

  it("keeps a stored 0% contribution rate instead of defaulting to 5%", () => {
    render(
      <PensionQuickStartWizard
        initialEmployeePercent={0}
        initialEmployerPercent={0}
        initialSalary={30000}
        onComplete={vi.fn()}
      />,
    );
    expect(
      (screen.getByLabelText(/employee/i, { selector: "#wizard-employee-pct" }) as HTMLInputElement)
        .value,
    ).toBe("0");
  });
});
