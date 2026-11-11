import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeDashboard } from "./HomeDashboard";

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: any) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const profileOverrides = vi.hoisted(() => ({ extraWidgets: [] as string[] }));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useUserProfile: () => ({
      profile: {
        id: "1",
        userId: "u1",
        displayName: "Alex",
        currency: "GBP",
        enabledPages: [
          "accounts",
          "budget",
          "savings",
          "pension",
          "mortgage",
          "forecast",
          "tax",
          "debt",
        ],
        dashboardWidgets: [
          "accounts",
          "budget",
          "savings",
          "pension",
          "mortgage",
          "forecast",
          "tax",
          ...profileOverrides.extraWidgets,
        ],
        dashboardWidgetOrder: [
          "accounts",
          "budget",
          "savings",
          "pension",
          "mortgage",
          "forecast",
          "tax",
          ...profileOverrides.extraWidgets,
        ],
        dashboardWidgetSizes: { accounts: "wide" },
        dashboardWidgetConfig: {},
      },
      updateProfile: mockUpdateProfile,
    }),
  };
});

const dummyProps = {
  user: { id: "u1" },
  checklistProps: {
    hasAccounts: true,
    hasProfile: true,
    hasBudget: true,
    hasSavings: true,
    hasPension: true,
    hasMortgageAccount: true,
    hasRunForecast: true,
    completedSteps: ["accounts", "budget", "profile", "savings", "pension", "mortgage", "forecast"],
  },
  accountsData: {
    netWorth: 50000,
    totalAssets: 60000,
    totalLiabilities: 10000,
    accountsCount: 3,
    typeTotals: { Current: 10000, Saving: 50000 },
  },
  budgetData: {
    monthlyIncome: 4000,
    monthlyExpenses: 2500,
    monthlySurplus: 1500,
    savingsRatePct: 38,
    runwayMonths: 12,
  },
  savingsData: {
    totalSavingsBalance: 50000,
    totalMonthlyContributions: 500,
    weightedInterestRate: 4.5,
    accountsCount: 2,
  },
  pensionData: {
    totalPensionBalance: 30000,
    potsCount: 1,
    employeePercent: 5,
    employerPercent: 3,
    isSalarySacrifice: true,
    monthlyContributionEst: 400,
  },
  mortgageData: {
    mortgageBalance: 150000,
    interestRate: 4.2,
    remainingTermYears: 22,
    hasMortgageAccount: true,
  },
  forecastData: {
    totalAssets: 60000,
    monthlySavingRate: 1500,
    annualSalary: 55000,
    estimatedTakeHome: 3200,
  },
  taxData: {
    taxYear: "2024/25",
    totalIncome: 12000,
    totalExpenses: 2000,
    netProfit: 10000,
    estimatedTaxDue: 2900,
    recordsCount: 5,
  },
};

describe("HomeDashboard", () => {
  it("renders welcome header and widgets for all enabled pages", () => {
    render(<HomeDashboard {...dummyProps} />);
    expect(screen.getByText(/Welcome back, Alex/i)).toBeDefined();
    expect(screen.getByText("Accounts and net worth")).toBeDefined();
    expect(screen.getByText("Budget planner")).toBeDefined();
    expect(screen.getByText("Savings and investments")).toBeDefined();
    expect(screen.getByText("Pension and retirement")).toBeDefined();
    expect(screen.getByText("Mortgage tools")).toBeDefined();
    expect(screen.getByText("Wealth forecaster")).toBeDefined();
    expect(screen.getByText("Tax and Self Assessment")).toBeDefined();
  });

  it("toggles customize mode toolbar when button is clicked", () => {
    render(<HomeDashboard {...dummyProps} />);
    const customizeBtn = screen.getByText("Customize Dashboard");
    fireEvent.click(customizeBtn);

    expect(screen.getByText("Done Customizing")).toBeDefined();
    expect(screen.getByText("Reset Default")).toBeDefined();

    // Reorder mode banner should be visible
    expect(screen.getByText(/Reorder mode active:/i)).toBeDefined();

    // Drag grip handles should be rendered
    const gripHandles = screen.getAllByLabelText("Drag to reorder");
    expect(gripHandles.length).toBeGreaterThan(0);
  });

  it("opens per-widget settings modal when cog icon is clicked", () => {
    render(<HomeDashboard {...dummyProps} />);
    const accountsCog = screen.getByLabelText("Customize Accounts and net worth widget");
    fireEvent.click(accountsCog);

    expect(screen.getByText("Accounts Widget Settings")).toBeDefined();
    expect(screen.getByText("Primary Highlight Metric")).toBeDefined();
    expect(screen.getByText("Asset Allocation Bar")).toBeDefined();

    const doneBtn = screen.getByText("Done");
    fireEvent.click(doneBtn);
    expect(screen.queryByText("Accounts Widget Settings")).toBeNull();
  });

  it("displays disabled widgets section when customize mode is enabled and re-adds to the bottom of the enabled section", () => {
    render(<HomeDashboard {...dummyProps} />);

    // Before customize mode, disabled widgets section should not be shown
    expect(screen.queryByText(/Disabled Widgets/i)).toBeNull();

    // Enable customize mode
    const customizeBtn = screen.getByText("Customize Dashboard");
    fireEvent.click(customizeBtn);

    // Now Disabled Widgets section is visible (financialHealth is in disabledWidgets)
    expect(screen.getByText(/Disabled Widgets/i)).toBeDefined();
    expect(
      screen.getByText(
        "These widgets are currently removed. Click 'Add' to re-enable any widget at the bottom of your dashboard.",
      ),
    ).toBeDefined();

    // Click "Add" button for Debt payoff
    const addBtn = screen.getByLabelText("Enable Debt payoff widget");
    fireEvent.click(addBtn);

    // Verify updateProfile was called with debt added to widgets and at the bottom of the order
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboardWidgets: expect.arrayContaining(["debt"]),
        dashboardWidgetOrder: expect.arrayContaining(["debt"]),
      }),
    );
    // Specifically check that debt was appended to the bottom
    const lastCall = mockUpdateProfile.mock.calls[mockUpdateProfile.mock.calls.length - 1][0];
    expect(lastCall.dashboardWidgetOrder[lastCall.dashboardWidgetOrder.length - 1]).toBe("debt");
  });

  it("does not render widgets when modules are unconfigured and displays build dashboard prompt", () => {
    const unconfiguredProps = {
      ...dummyProps,
      checklistProps: {
        hasAccounts: false,
        hasProfile: false,
        hasBudget: false,
        hasSavings: false,
        hasPension: false,
        hasMortgageAccount: false,
        hasRunForecast: false,
        completedSteps: [],
      },
      accountsData: { ...dummyProps.accountsData, accountsCount: 0 },
      budgetData: { ...dummyProps.budgetData, monthlyIncome: 0, monthlyExpenses: 0 },
      savingsData: { ...dummyProps.savingsData, accountsCount: 0 },
      pensionData: { ...dummyProps.pensionData, potsCount: 0 },
      mortgageData: { ...dummyProps.mortgageData, hasMortgageAccount: false, mortgageBalance: 0 },
      forecastData: { ...dummyProps.forecastData },
      taxData: { ...dummyProps.taxData, recordsCount: 0 },
    };

    render(<HomeDashboard {...unconfiguredProps} />);

    // Widgets should NOT be visible
    expect(screen.queryByText("Accounts and net worth")).toBeNull();
    expect(screen.queryByText("Budget planner")).toBeNull();
    expect(screen.queryByText("Savings and investments")).toBeNull();
    expect(screen.queryByText("Pension and retirement")).toBeNull();
    expect(screen.queryByText("Debt payoff")).toBeNull();
    expect(screen.queryByText("Mortgage tools")).toBeNull();
    expect(screen.queryByText("Wealth forecaster")).toBeNull();
    expect(screen.queryByText("Tax and Self Assessment")).toBeNull();

    // Inviting setup prompt should be displayed
    expect(screen.getByText("Ready to Build Your Dashboard")).toBeDefined();
    expect(
      screen.getByText(
        "Complete your setup tasks in the checklist above. As you finish each section, its live widget will automatically appear right here!",
      ),
    ).toBeDefined();
  });

  it("unlocks only the configured widgets dynamically", () => {
    const partiallyConfiguredProps = {
      ...dummyProps,
      checklistProps: {
        hasAccounts: true,
        hasProfile: false,
        hasBudget: false,
        hasSavings: false,
        hasPension: false,
        hasMortgageAccount: false,
        hasRunForecast: false,
        completedSteps: ["accounts"],
      },
      accountsData: { ...dummyProps.accountsData, accountsCount: 1 },
      budgetData: { ...dummyProps.budgetData, monthlyIncome: 0, monthlyExpenses: 0 },
      savingsData: { ...dummyProps.savingsData, accountsCount: 0 },
      pensionData: { ...dummyProps.pensionData, potsCount: 0 },
      mortgageData: { ...dummyProps.mortgageData, hasMortgageAccount: false, mortgageBalance: 0 },
      forecastData: { ...dummyProps.forecastData },
      taxData: { ...dummyProps.taxData, recordsCount: 0 },
    };

    render(<HomeDashboard {...partiallyConfiguredProps} />);

    // Accounts is configured -> displayed
    expect(screen.getByText("Accounts and net worth")).toBeDefined();

    // Budget, Savings, Pension are unconfigured -> not displayed
    expect(screen.queryByText("Budget planner")).toBeNull();
    expect(screen.queryByText("Savings and investments")).toBeNull();
    expect(screen.queryByText("Pension and retirement")).toBeNull();
  });

  it("mortgage-only user does not see the debt widget", () => {
    profileOverrides.extraWidgets = ["debt"];
    const mortgageOnly = {
      ...dummyProps,
      checklistProps: { ...dummyProps.checklistProps, completedSteps: ["accounts"] },
      accountsData: { ...dummyProps.accountsData, totalLiabilities: 200000 },
      debtData: null,
    };
    render(<HomeDashboard {...mortgageOnly} />);
    profileOverrides.extraWidgets = [];
    expect(screen.queryByText("Debt payoff")).toBeNull();
  });

  it("shows the debt widget when there is consumer debt", () => {
    profileOverrides.extraWidgets = ["debt"];
    const withDebt = {
      ...dummyProps,
      debtData: {
        totalDebt: 3000,
        debtCount: 1,
        highInterestCount: 1,
        monthlyMinimumTotal: 90,
        debtFreeDate: "March 2029",
        debts: [],
      },
    };
    render(<HomeDashboard {...withDebt} />);
    profileOverrides.extraWidgets = [];
    expect(screen.getByText("Debt payoff")).toBeDefined();
  });
});
