import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeDashboard, type HomeDashboardProps } from "./HomeDashboard";

// The global test setup stubs Link to its children; these tests need real anchors.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const mockUpdateProfile = vi.hoisted(() => vi.fn());
const profileOverrides = vi.hoisted(() => ({ extraWidgets: [] as string[] }));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual: any = await importOriginal();
  const { useState } = await import("react");
  return {
    ...actual,
    useUserProfile: () => {
      const [widgets, setWidgets] = useState<string[]>([
        "accounts",
        "budget",
        "savings",
        "pension",
        "mortgage",
        "tax",
        ...profileOverrides.extraWidgets,
      ]);
      return {
        profile: {
          id: "1",
          userId: "u1",
          firstName: "Alex",
          currency: "GBP",
          enabledPages: ["accounts", "budget", "savings", "pension", "mortgage", "tax", "debt"],
          dashboardWidgets: widgets,
          dashboardWidgetOrder: ["tax", "accounts"],
          dashboardWidgetSizes: { accounts: "wide" },
          dashboardWidgetConfig: {
            accounts: { showAllocationBar: false },
          },
        },
        updateProfile: async (updates: { dashboardWidgets?: string[] }) => {
          await mockUpdateProfile(updates);
          if (updates.dashboardWidgets) setWidgets(updates.dashboardWidgets);
        },
      };
    },
  };
});

const debtSummary = {
  totalDebt: 3000,
  debtCount: 1,
  highInterestCount: 1,
  monthlyMinimumTotal: 90,
  monthlyMinimumEstimated: false,
  debtFreeDate: "March 2029",
  debts: [],
};

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
    completedSteps: ["accounts", "budget", "profile", "savings", "pension", "mortgage"],
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
    estimatedTaxDue: null,
    recordsCount: 5,
  },
};

const renderDashboard = (props: Partial<HomeDashboardProps> = {}) =>
  render(
    <MemoryRouter>
      <HomeDashboard {...(dummyProps as any)} {...props} />
    </MemoryRouter>,
  );

const openPanel = () => {
  fireEvent.click(screen.getByRole("button", { name: /Show or hide widgets/ }));
  return screen.getByRole("dialog", { name: "Show or hide widgets" });
};

const unconfigured = {
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

describe("HomeDashboard", () => {
  beforeEach(() => {
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
    profileOverrides.extraWidgets = [];
  });

  it("renders welcome header and widgets for all enabled pages", () => {
    renderDashboard();
    expect(screen.getByRole("heading", { level: 1, name: "Hi, Alex" })).toBeDefined();
    // Straight after a first onboarding there is no "back" to welcome the user to.
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    expect(screen.getByText("Accounts")).toBeDefined();
    expect(screen.getByText("Budget")).toBeDefined();
    expect(screen.getByText("Savings")).toBeDefined();
    expect(screen.getByText("Pension")).toBeDefined();
    expect(screen.getByText("Mortgage")).toBeDefined();
    expect(screen.queryByText("Growth forecast")).toBeNull();
    expect(screen.getByText("Self Assessment")).toBeDefined();
  });

  it("groups the page into plain-language bands", () => {
    renderDashboard();
    for (const name of ["Where you stand", "Your plans at a glance"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeDefined();
    }
  });

  it("labels sandbox data as an example instead of welcoming the user back", () => {
    renderDashboard({ isSample: true });
    expect(screen.getByRole("heading", { level: 1, name: "Example snapshot" })).toBeDefined();
    expect(screen.queryByText(/Hi, Alex/)).toBeNull();
    expect(screen.getByText(/Sample data: illustrative figures/)).toBeDefined();
    expect(document.querySelectorAll('[data-testid="projection-notice"]')).toHaveLength(1);
  });

  it("shows the four KPIs with real figures", () => {
    renderDashboard();
    for (const label of ["Net worth", "Monthly surplus", "Weekly safe to spend", "Liquid cash"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    // Widgets may still say "Not set" (for example the mortgage term); the KPI figures never do.
    const hero = document.querySelector('[data-tone="hero"]');
    expect(hero?.textContent).toContain("£50,000");
    expect(hero?.textContent).not.toContain("Not set");
  });

  it("has no drag, resize, move or per-widget settings controls", () => {
    renderDashboard();
    expect(screen.queryByText(/Customi[sz]e Dashboard/)).toBeNull();
    expect(screen.queryByLabelText("Drag to reorder")).toBeNull();
    expect(screen.queryByLabelText("Move widget up")).toBeNull();
    expect(screen.queryByLabelText("Move widget down")).toBeNull();
    expect(screen.queryByLabelText(/Switch to .* width/)).toBeNull();
    expect(screen.queryByText(/Reorder mode active/)).toBeNull();
  });

  it("hides a widget from the checklist and writes only dashboardWidgets", async () => {
    renderDashboard();
    const dialog = openPanel();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Budget/ }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    const payload = mockUpdateProfile.mock.calls[0]?.[0];
    expect(Object.keys(payload)).toEqual(["dashboardWidgets"]);
    expect(payload.dashboardWidgets).not.toContain("budget");
    expect(payload.dashboardWidgets).toContain("accounts");
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByText("Budget")).toBeNull());
  });

  it("no longer renders a growth forecast widget for the retired forecast module", () => {
    renderDashboard();
    expect(screen.queryByText(/20yr Wealth Projection/)).toBeNull();
  });

  it("reverts a failed save to the last confirmed list, not the original", async () => {
    renderDashboard();
    let dialog = openPanel();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Budget/ }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    mockUpdateProfile.mockRejectedValueOnce(new Error("offline"));
    dialog = screen.getByRole("dialog", { name: "Show or hide widgets" });
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Savings/ }));
    await screen.findByRole("alert");
    expect(
      (within(dialog).getByRole("checkbox", { name: /^Budget/ }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(
      (within(dialog).getByRole("checkbox", { name: /^Savings/ }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("never writes widget order, sizes or config", async () => {
    renderDashboard({ debtData: debtSummary });
    const dialog = openPanel();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Debt/ }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Self Assessment/ }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(2));
    for (const [payload] of mockUpdateProfile.mock.calls) {
      expect(payload).not.toHaveProperty("dashboardWidgetOrder");
      expect(payload).not.toHaveProperty("dashboardWidgetSizes");
      expect(payload).not.toHaveProperty("dashboardWidgetConfig");
    }
  });

  it("re-shows a hidden widget in the fixed canonical order, not at the bottom", async () => {
    renderDashboard({ debtData: debtSummary });
    const dialog = openPanel();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Debt/ }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledTimes(1));
    const shown: string[] = mockUpdateProfile.mock.calls[0]?.[0].dashboardWidgets;
    expect(shown.indexOf("debt")).toBe(shown.indexOf("budget") + 1);
  });

  it("keeps show or hide choices local and never calls the backend when not persisting", async () => {
    renderDashboard({ persistVisibility: false });
    const dialog = openPanel();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Budget/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByText("Budget")).toBeNull());
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("restores the widget and shows an error when saving fails", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("offline"));
    renderDashboard();
    const dialog = openPanel();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: /^Budget/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not save/i);
    const box = within(dialog).getByRole("checkbox", { name: /^Budget/ });
    expect((box as HTMLInputElement).checked).toBe(true);
  });

  it("does not render widgets when modules are unconfigured and shows the empty state", () => {
    renderDashboard(unconfigured as any);

    expect(screen.queryByText("Accounts")).toBeNull();
    expect(screen.queryByText("Budget")).toBeNull();
    expect(screen.queryByText("Savings")).toBeNull();
    expect(screen.queryByText("Pension")).toBeNull();
    expect(screen.queryByText("Debt")).toBeNull();
    expect(screen.queryByText("Mortgage")).toBeNull();
    expect(screen.queryByText("Growth forecast")).toBeNull();
    expect(screen.queryByText("Self Assessment")).toBeNull();

    expect(screen.getByRole("heading", { name: "Build your dashboard" })).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Add an account" }).length).toBeGreaterThan(0);
  });

  it("shows Not set with actions for unknown KPIs instead of zero", () => {
    renderDashboard({
      ...(unconfigured as any),
      accountsData: {
        netWorth: 0,
        totalAssets: 0,
        totalLiabilities: 0,
        accountsCount: 0,
        typeTotals: {},
      },
      savingsData: { accountsCount: 0, totalSavingsBalance: 0 },
    });
    expect(screen.getAllByText("Not set")).toHaveLength(4);
    expect(screen.getAllByRole("link", { name: "Add your budget" }).length).toBeGreaterThan(0);
  });

  it("shows an all-hidden empty state that offers the checklist", async () => {
    renderDashboard({ persistVisibility: false });
    const dialog = openPanel();
    for (const box of within(dialog).getAllByRole("checkbox")) {
      if ((box as HTMLInputElement).checked) fireEvent.click(box);
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "No widgets showing" })).toBeDefined(),
    );
  });

  it("unlocks only the configured widgets dynamically", () => {
    renderDashboard({
      ...(unconfigured as any),
      checklistProps: {
        ...unconfigured.checklistProps,
        hasAccounts: true,
        completedSteps: ["accounts"],
      },
      accountsData: { ...dummyProps.accountsData, accountsCount: 1 },
    });

    expect(screen.getByText("Accounts")).toBeDefined();
    expect(screen.queryByText("Budget")).toBeNull();
    expect(screen.queryByText("Savings")).toBeNull();
    expect(screen.queryByText("Pension")).toBeNull();
  });

  it("mortgage-only user does not see the debt widget", () => {
    profileOverrides.extraWidgets = ["debt"];
    renderDashboard({
      checklistProps: { ...dummyProps.checklistProps, completedSteps: ["accounts"] },
      accountsData: { ...dummyProps.accountsData, totalLiabilities: 200000 },
      debtData: null,
    });
    expect(screen.queryByText("Debt")).toBeNull();
  });

  it("shows the debt widget when there is consumer debt", () => {
    profileOverrides.extraWidgets = ["debt"];
    renderDashboard({ debtData: debtSummary });
    expect(screen.getByText("Debt")).toBeDefined();
  });

  it("mortgage-only user does not see the Stage 1 unsecured debt card", () => {
    renderDashboard({
      accountsData: { ...dummyProps.accountsData, totalLiabilities: 200000 },
      debtData: null,
    });
    expect(screen.queryByText(/Your unsecured debt and payoff date/)).toBeNull();
    expect(screen.queryByText(/of unsecured debt remaining/)).toBeNull();
  });

  describe("with no budget entered", () => {
    const noBudget = {
      budgetData: {
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlySurplus: 0,
        savingsRatePct: 0,
        runwayMonths: 0,
      },
      accountsData: { ...dummyProps.accountsData, totalLiabilities: 3000 },
      debtData: {
        ...debtSummary,
        debtFreeDate: null,
        debts: [{ id: "d1", name: "Card", balance: 3000, apr: 22, minimumPayment: 90 }],
      },
    };

    it("does not show a £0 weekly allowance invented from an empty budget", () => {
      renderDashboard(noBudget as any);
      expect(screen.getByText(/Your unsecured debt and payoff date/)).toBeDefined();
      expect(screen.queryByText(/Safe to spend:/)).toBeNull();
      expect(screen.getByText(/Add your budget to see your safe to spend/)).toBeDefined();
      // Surplus and weekly safe to spend are both Not set.
      expect(
        screen.getAllByRole("link", { name: "Add your budget" }).length,
      ).toBeGreaterThanOrEqual(2);
    });

    it("hides the Stage 1 card when only a zero-surplus budget would imply it", () => {
      renderDashboard({
        ...(noBudget as any),
        debtData: {
          ...noBudget.debtData,
          debts: [{ id: "d1", name: "Loan", balance: 3000, apr: 3, minimumPayment: 90 }],
        },
      });
      expect(screen.queryByText(/Your unsecured debt and payoff date/)).toBeNull();
    });
  });
});
