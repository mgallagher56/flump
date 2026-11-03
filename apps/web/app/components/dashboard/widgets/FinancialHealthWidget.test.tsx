import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinancialHealthWidget } from "./FinancialHealthWidget";

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: any) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

const mockAccounts = {
  netWorth: 65000,
  totalAssets: 80000,
  totalLiabilities: 15000,
  accountsCount: 3,
};

const mockBudget = {
  monthlyIncome: 4500,
  monthlyExpenses: 2800,
  monthlySurplus: 1700,
  savingsRatePct: 37,
  runwayMonths: 10,
};

const mockSavings = {
  totalSavingsBalance: 40000,
  totalMonthlyContributions: 600,
  weightedInterestRate: 4.8,
  accountsCount: 2,
};

const mockPension = {
  totalPensionBalance: 35000,
  potsCount: 1,
  employeePercent: 5,
  employerPercent: 4,
  isSalarySacrifice: true,
  monthlyContributionEst: 450,
};

const mockMortgage = {
  mortgageBalance: 180000,
  interestRate: 4.1,
  remainingTermYears: 20,
  hasMortgageAccount: true,
};

const mockForecast = {
  totalAssets: 80000,
  monthlySavingRate: 1700,
  annualSalary: 60000,
  estimatedTakeHome: 3400,
};

const mockTax = {
  taxYear: "2024/25",
  totalIncome: 15000,
  totalExpenses: 3000,
  netProfit: 12000,
  estimatedTaxDue: 3500,
  recordsCount: 6,
};

const defaultProps = {
  accountsData: mockAccounts,
  budgetData: mockBudget,
  savingsData: mockSavings,
  pensionData: mockPension,
  mortgageData: mockMortgage,
  forecastData: mockForecast,
  taxData: mockTax,
  enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "forecast", "tax"],
  editMode: false,
  size: "wide" as const,
  config: {},
  onUpdateConfig: vi.fn(),
  onToggleSize: vi.fn(),
  onHide: vi.fn(),
  onMoveUp: vi.fn(),
  onMoveDown: vi.fn(),
};

describe("FinancialHealthWidget", () => {
  it("does not render an open button and is collapsed by default", () => {
    render(<FinancialHealthWidget {...defaultProps} />);

    expect(screen.getByText("Financial Health Summary")).toBeDefined();
    // Does not have an Open button
    expect(screen.queryByRole("link", { name: /Open/i })).toBeNull();

    // Qualitative rating badge
    expect(screen.getByText(/Excellent Health/i)).toBeDefined();

    // By default, the tabbed section is collapsed
    expect(screen.getByText("View Breakdown & Tips")).toBeDefined();
    expect(screen.queryByText("What's Working Well")).toBeNull();

    // Clicking the collapse/expand button reveals the tabs and breakdown
    fireEvent.click(screen.getByText("View Breakdown & Tips"));
    expect(screen.getByText("Hide Breakdown")).toBeDefined();
    expect(screen.getByText("What's Working Well")).toBeDefined();
    expect(screen.getByText("Areas to Improve")).toBeDefined();
  });

  it("switches tabs to Wins, To Improve, and Modules when expanded", () => {
    render(<FinancialHealthWidget {...defaultProps} />);

    // Expand breakdown
    fireEvent.click(screen.getByText("View Breakdown & Tips"));

    // Click on Wins tab button
    const winsTab = screen.getByRole("button", { name: /^Wins/i });
    fireEvent.click(winsTab);
    expect(screen.getByText(/Consistent Saver/i)).toBeDefined();

    // Click on To Improve tab button
    const improveTab = screen.getByRole("button", { name: /^To Improve/i });
    fireEvent.click(improveTab);
    expect(screen.getByText(/Simulate Overpayments|Reserve Tax Liability/i)).toBeDefined();

    // Click on Modules tab button
    const modulesTab = screen.getByRole("button", { name: /^Modules/i });
    fireEvent.click(modulesTab);
    expect(screen.getByText("Accounts & Net Worth")).toBeDefined();
    expect(screen.getByText("Budget Planner")).toBeDefined();
  });

  it("only evaluates enabled sections when calculating health and module status", () => {
    // Only enable accounts and budget (mortgage, pension, tax disabled)
    render(<FinancialHealthWidget {...defaultProps} enabledPages={["accounts", "budget"]} />);

    // Expand breakdown
    fireEvent.click(screen.getByText("View Breakdown & Tips"));

    // Switch to modules tab
    const modulesTab = screen.getByRole("button", { name: /^Modules/i });
    fireEvent.click(modulesTab);

    expect(screen.getByText("Accounts & Net Worth")).toBeDefined();
    expect(screen.getByText("Budget Planner")).toBeDefined();
    // Disabled modules should not appear in the module list
    expect(screen.queryByText("Mortgage Tools")).toBeNull();
    expect(screen.queryByText("Tax & Self-Assessment")).toBeNull();
  });

  it("hides breakdown completely when showBreakdown is configured false (or hideTabs is true)", () => {
    render(<FinancialHealthWidget {...defaultProps} config={{ showBreakdown: false }} />);

    // Summary banner is present
    expect(screen.getByText(/Excellent Health/i)).toBeDefined();
    // Neither the expand button nor tabs are shown
    expect(screen.queryByText("View Breakdown & Tips")).toBeNull();
    expect(screen.queryByText("Highlights")).toBeNull();
  });

  it("opens settings modal and allows toggling numeric score and detailed breakdown", () => {
    const handleUpdateConfig = vi.fn();
    render(<FinancialHealthWidget {...defaultProps} onUpdateConfig={handleUpdateConfig} />);

    const cogBtn = screen.getByLabelText("Customize Financial Health Summary widget");
    fireEvent.click(cogBtn);

    expect(screen.getByText("Financial Health Widget Settings")).toBeDefined();
    expect(screen.getByText("Show Score Number")).toBeDefined();
    expect(screen.getByText("Show Detailed Breakdown")).toBeDefined();
    // Collapsible Tabbed Section is removed since it's always collapsible
    expect(screen.queryByText("Collapsible Tabbed Section")).toBeNull();
    expect(screen.queryByText("Hide Tabbed Section")).toBeNull();

    // Toggle detailed breakdown
    const breakdownBtn = screen.getByLabelText("Toggle show detailed breakdown");
    fireEvent.click(breakdownBtn);
    expect(handleUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ showBreakdown: false, hideTabs: true }),
    );

    // Click Done to close
    const doneBtn = screen.getByText("Done");
    fireEvent.click(doneBtn);

    expect(screen.queryByText("Financial Health Widget Settings")).toBeNull();
  });

  it("opens score methodology modal when 'How it's scored' is clicked and displays what counts towards good vs bad score", () => {
    render(<FinancialHealthWidget {...defaultProps} />);

    // Click "How it's scored" button in the summary banner
    const howScoredBtn = screen.getByRole("button", { name: /How health score is calculated/i });
    fireEvent.click(howScoredBtn);

    // Modal title & content
    expect(screen.getByText("How Your Health Score Is Created")).toBeDefined();
    expect(screen.getByText(/Total Points/i)).toBeDefined();
    expect(screen.getByText("Scoring Factors & What Counts")).toBeDefined();

    // Verify Good vs Bad score indicators
    expect(screen.getAllByText(/What boosts score:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/What hurts score:/i).length).toBeGreaterThan(0);

    // Close modal
    const closeBtn = screen.getByLabelText("Close score methodology modal");
    fireEvent.click(closeBtn);
    expect(screen.queryByText("How Your Health Score Is Created")).toBeNull();
  });

  it("switches to the Scoring Rules tab and shows scoring breakdown inline", () => {
    render(<FinancialHealthWidget {...defaultProps} />);

    // Expand breakdown
    fireEvent.click(screen.getByText("View Breakdown & Tips"));

    // Switch to Scoring Rules tab
    const scoringTab = screen.getByRole("button", { name: /^Scoring Rules/i });
    fireEvent.click(scoringTab);

    // Verify criteria and boost/hurt guidance
    expect(screen.getAllByText(/✓ Boosts:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/✗ Hurts:/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Monthly Cashflow Surplus")).toBeDefined();
    expect(screen.getByText("Emergency Runway (≥ 3 Months)")).toBeDefined();
  });
});
