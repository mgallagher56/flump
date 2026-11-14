import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { SampleModeProvider } from "~/context/SampleModeContext";
import { HomeDashboard, type HomeDashboardProps } from "./HomeDashboard";

const userProfile = {
  firstName: "Alex",
  enabledPages: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
  dashboardWidgets: ["accounts", "budget", "debt", "savings", "pension", "mortgage"],
};

const populated: HomeDashboardProps = {
  userProfile,
  persistVisibility: false,
  checklistProps: {
    hasAccounts: true,
    hasProfile: true,
    hasBudget: true,
    hasSavings: true,
    hasPension: true,
    hasMortgageAccount: true,
    hasRunForecast: false,
    completedSteps: ["accounts", "budget", "savings", "pension", "mortgage"],
  },
  checkIn: { currentMonth: "2026-11", lastRecordedMonth: "2026-10" },
  netWorthPrior: { month: "2026-10", netWorth: 49680 },
  accountsData: { netWorth: 50000, homeEstimate: 0, accountsCount: 4 },
  budgetData: {
    budgetKnown: true,
    monthlyIncome: 4000,
    monthlyExpenses: 2500,
    monthlySurplus: 1500,
    monthsOfCover: 6.2,
  },
  savingsData: { totalSavingsBalance: 20000, accountsCount: 2 },
  pensionData: { totalPensionBalance: 30000, potsCount: 1, employeePercent: 5, employerPercent: 3 },
  mortgageData: { mortgageBalance: 150000, hasMortgageAccount: true },
  taxData: { estimatedTaxDue: null, recordsCount: 0 },
  debtData: null,
};

const meta: Meta<typeof HomeDashboard> = {
  title: "6. Pages/Dashboard/HomeDashboard",
  component: HomeDashboard,
  parameters: { layout: "fullscreen" },
  args: populated,
};

export default meta;
type Story = StoryObj<typeof HomeDashboard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Populated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { level: 1, name: "Your money" })[0]).toBeDefined();
    await expect(canvas.getAllByText("£320 since October")[0]).toBeDefined();
  },
};

export const WithDebt: Story = {
  args: {
    accountsData: { netWorth: -2000, homeEstimate: 0, accountsCount: 4 },
    netWorthPrior: null,
    debtData: {
      totalDebt: 8000,
      debtCount: 2,
      highInterestCount: 1,
      monthlyMinimumTotal: 250,
      monthlyMinimumEstimated: false,
      debtFreeDate: "March 2029",
      debts: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("What you owe")[0]).toBeDefined();
    await expect(canvasElement.querySelector('[data-notice="projection"]')).not.toBeNull();
  },
};

export const SetupRowExpands: Story = {
  args: {
    checklistProps: { ...populated.checklistProps, completedSteps: [], hasSavings: false },
  },
  beforeEach: () => {
    try {
      window.localStorage.removeItem("flump_setup_checklist_dismissed");
    } catch {
      // Storage may be unavailable in the story runner.
    }
  },
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getAllByRole("button", { name: /Finish setting up/ })[0];
    if (!toggle) throw new Error("Setup row missing");
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-expanded", "true"));
  },
};

export const NearlyEmpty: Story = {
  args: {
    checklistProps: {
      hasAccounts: false,
      hasProfile: true,
      hasBudget: false,
      hasMortgageAccount: false,
      hasRunForecast: false,
      completedSteps: [],
    },
    checkIn: null,
    netWorthPrior: null,
    accountsData: { netWorth: 0, accountsCount: 0 },
    budgetData: { budgetKnown: false, monthlyIncome: 0, monthlyExpenses: 0, monthlySurplus: null },
    savingsData: { totalSavingsBalance: 0, accountsCount: 0 },
    pensionData: {
      totalPensionBalance: 0,
      potsCount: 0,
      employeePercent: null,
      employerPercent: null,
    },
    mortgageData: { mortgageBalance: 0, hasMortgageAccount: false },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Nothing to show yet")[0]).toBeDefined();
  },
};

export const Sample: Story = {
  args: { isSample: true },
  decorators: [
    (Story) => (
      <SampleModeProvider value>
        <Story />
      </SampleModeProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryAllByRole("link", { name: /Open/ })).toHaveLength(0);
    await expect(canvas.getAllByRole("img", { name: "Locked in this example" })[0]).toBeDefined();
  },
};
