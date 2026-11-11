import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockMarkChecklistStep = vi.fn().mockResolvedValue({});

let testLoaderData: any = {
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
};

let testProfileData: any = {
  annualSalary: 50000,
  pensionPercent: 5.0,
  pensionEmployerPercent: 3.0,
  isSalarySacrifice: true,
  isSalarySacrificeEmployerNi: false,
  employmentType: "employed",
  setupChecklistCompletedSteps: ["pension"],
};

vi.mock("react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLoaderData: () => testLoaderData,
  useFetcher: () => ({
    submit: vi.fn(),
    state: "idle",
  }),
}));

vi.mock("~/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    profile: testProfileData,
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

    expect(screen.getByText("Pension and retirement tracking")).toBeDefined();
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

  it("handles reset financial data state with zero values", () => {
    testLoaderData = {
      accounts: [],
      accountDetails: [],
      userProfile: {
        annualSalary: null,
        pensionPercent: 0,
        pensionEmployerPercent: 0,
        hasResetFinancialData: true,
        setupChecklistCompletedSteps: ["pension"],
      },
    };

    testProfileData = {
      annualSalary: null,
      pensionPercent: 0,
      pensionEmployerPercent: 0,
      hasResetFinancialData: true,
      setupChecklistCompletedSteps: ["pension"],
    };

    render(<PensionContainer />);
    expect(screen.getByText("Total Pension Wealth")).toBeDefined();
    expect(screen.getByText("Across 0 pension pots")).toBeDefined();
    // Should show £0 Gross Salary and 0% contributions
    expect(screen.getAllByText("£0").length).toBeGreaterThan(0);
  });

  describe("assumptions", () => {
    const setProfile = (profile: Record<string, unknown>) => {
      testLoaderData = { accounts: [], accountDetails: [], userProfile: profile };
      testProfileData = profile;
    };

    it("no salary shows the add-salary prompt, not a projection", () => {
      setProfile({
        annualSalary: null,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        setupChecklistCompletedSteps: ["pension"],
      });
      const { container } = render(<PensionContainer />);

      const prompt = screen.getByText(/Add your salary in/);
      expect(prompt.textContent).toContain("to project your pension.");
      expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe(
        "/app/profile",
      );
      expect(screen.queryByText(/45,000/)).toBeNull();
      expect(container.querySelector("#pension-forecast-salary")).toBeNull();
    });

    it("unsaved profile shows the assumed label on contribution rates", () => {
      setProfile({
        annualSalary: 50000,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        createdAt: "2026-11-01T09:00:00.000Z",
        updatedAt: "2026-11-01T09:00:00.000Z",
        setupChecklistCompletedSteps: ["pension"],
      });
      render(<PensionContainer />);
      expect(screen.getAllByText("Assumed: auto-enrolment minimum").length).toBe(2);
    });

    it("a saved profile does not show the assumed label", () => {
      setProfile({
        annualSalary: 50000,
        pensionPercent: 5,
        pensionEmployerPercent: 3,
        createdAt: "2026-11-01T09:00:00.000Z",
        updatedAt: "2026-11-05T10:30:00.000Z",
        setupChecklistCompletedSteps: ["pension"],
      });
      render(<PensionContainer />);
      expect(screen.queryByText("Assumed: auto-enrolment minimum")).toBeNull();
    });

    it("keeps a saved 0% contribution rate as 0%", () => {
      setProfile({
        annualSalary: 50000,
        pensionPercent: 0,
        pensionEmployerPercent: 0,
        createdAt: "2026-11-01T09:00:00.000Z",
        updatedAt: "2026-11-05T10:30:00.000Z",
        setupChecklistCompletedSteps: ["pension"],
      });
      render(<PensionContainer />);
      expect(screen.getByText(/Employee:/).parentElement?.textContent).toContain("0%");
      expect(screen.queryByText("Assumed: auto-enrolment minimum")).toBeNull();
    });
  });
});
