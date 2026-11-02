import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockMarkChecklistStep = vi.fn().mockResolvedValue({});

vi.mock("react-router", () => ({
  useLoaderData: () => ({
    accounts: [
      {
        id: "p1",
        name: "Current Workplace Pot",
        type: "Pension",
        balance: 10000,
        interestRate: 6.0,
        monthlyContribution: 100,
        isCurrent: true,
      },
      {
        id: "p2",
        name: "Old Employer Pot",
        type: "Pension",
        balance: 20000,
        interestRate: 5.0,
        monthlyContribution: 50,
        isCurrent: false,
      },
    ],
    accountDetails: [],
    userProfile: {
      annualSalary: 50000,
      pensionPercent: 5.0,
      pensionEmployerPercent: 3.0,
      isSalarySacrifice: true,
      isSalarySacrificeEmployerNi: false,
      employmentType: "employed",
      setupChecklistCompletedSteps: ["pension"],
    },
  }),
  useFetcher: () => ({
    submit: vi.fn(),
    state: "idle",
  }),
}));

vi.mock("~/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    profile: {
      annualSalary: 50000,
      pensionPercent: 5.0,
      pensionEmployerPercent: 3.0,
      isSalarySacrifice: true,
      isSalarySacrificeEmployerNi: false,
      employmentType: "employed",
      setupChecklistCompletedSteps: ["pension"],
    },
    setProfile: vi.fn(),
    updateProfile: mockUpdateProfile,
    markChecklistStep: mockMarkChecklistStep,
  }),
}));

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import PensionContainer from "./PensionContainer";

describe("PensionContainer", () => {
  it("renders contributions breakdown and toggles inline editing for employer NI", async () => {
    render(<PensionContainer />);

    expect(screen.getByText("Pension & Retirement Tracking")).toBeDefined();
    expect(screen.getByText("Current Contributions Breakdown (UK Auto-Enrolment)")).toBeDefined();

    // Click Edit Rates button
    const editBtn = screen.getByRole("button", { name: /Edit Rates/i });
    fireEvent.click(editBtn);

    // Verify both Salary Sacrifice and Pass on Employer NI checkboxes exist
    expect(screen.getByLabelText(/Salary Sacrifice \(saves NI\)/i)).toBeDefined();
    const employerNiCheckbox = screen.getByLabelText(/Pass on Employer NI/i);
    expect(employerNiCheckbox).toBeDefined();
    expect((employerNiCheckbox as HTMLInputElement).checked).toBe(false);

    // Toggle employer NI on
    fireEvent.click(employerNiCheckbox);
    expect((employerNiCheckbox as HTMLInputElement).checked).toBe(true);

    // Click Save to Profile
    const saveBtn = screen.getByRole("button", { name: /Save to Profile/i });
    fireEvent.click(saveBtn);

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
      }),
    );
  });

  it("calculates total monthly inflow correctly, taking direct contributions only from current pots", () => {
    render(<PensionContainer />);

    // Total monthly inflow should include £100 direct contribution from current pot, ignoring past pot
    expect(screen.getByText("Total Monthly Inflow")).toBeDefined();
    expect(screen.getByText("£433")).toBeDefined();
    expect(screen.getByText(/£100 direct/)).toBeDefined();
    expect(screen.getAllByText("Current Workplace Pot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Old Employer Pot").length).toBeGreaterThan(0);
    expect(screen.getByText("Current Pot")).toBeDefined();
    expect(screen.getByText("Past Pot")).toBeDefined();
  });
});
