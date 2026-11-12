import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { HomeDashboard } from "./HomeDashboard";

const userProfile = {
  displayName: "Alex",
  enabledPages: ["accounts", "budget", "debt", "savings", "pension", "mortgage", "forecast"],
  dashboardWidgets: ["accounts", "budget", "savings", "pension", "mortgage", "forecast"],
};

const populated = {
  user: { id: "u1" },
  userProfile,
  persistVisibility: false,
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
  taxData: { recordsCount: 0 },
  debtData: null,
};

const meta: Meta<typeof HomeDashboard> = {
  title: "3. Financial Patterns & Sections/HomeDashboard",
  component: HomeDashboard,
  parameters: { layout: "fullscreen" },
  args: populated as any,
};

export default meta;
type Story = StoryObj<typeof HomeDashboard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Budget")[0]).toBeDefined();

    const open = canvas.getAllByRole("button", { name: /Show or hide widgets/ })[0];
    if (!open) throw new Error("Show or hide button missing");
    await userEvent.click(open);

    const dialog = await within(document.body).findByRole("dialog", {
      name: "Show or hide widgets",
    });
    // The legacy widgets still carry their own dark-mode contrast debt (cleared in PR2 to PR4), so
    // the story ends with every widget hidden: the checklist and empty state are what axe checks.
    for (const box of within(dialog).getAllByRole("checkbox")) {
      if ((box as HTMLInputElement).checked) await userEvent.click(box);
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));

    await waitFor(() => expect(canvas.queryAllByText("Budget")).toHaveLength(0));
    await expect(canvas.getAllByRole("heading", { name: "No widgets showing" })[0]).toBeDefined();
  },
};

export const NotSetKpis: Story = {
  args: {
    userProfile: { ...userProfile, dashboardWidgets: [] },
    checklistProps: { ...populated.checklistProps, hasAccounts: false, hasBudget: false },
    accountsData: {
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      accountsCount: 0,
      typeTotals: {},
    },
    budgetData: { monthlyIncome: 0, monthlyExpenses: 0, monthlySurplus: 0 },
    savingsData: { accountsCount: 0, totalSavingsBalance: 0 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set").length).toBeGreaterThanOrEqual(4);
    await expect(canvas.getAllByRole("link", { name: "Add an account" })[0]).toBeDefined();
  },
};

export const EmptyState: Story = {
  args: { userProfile: { ...userProfile, dashboardWidgets: [] } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByRole("heading", { name: "No widgets showing" })[0],
    ).toBeDefined();
  },
};
