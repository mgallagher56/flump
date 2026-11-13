import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { sampleBudgetEntries } from "~/features/budget/sampleBudgetEntries";
import BudgetContainer from "./BudgetContainer";

const loaderData = {
  accounts: [
    { id: "acc-1", name: "Monzo", type: "Current", balance: 4500 },
    { id: "acc-2", name: "Marcus", type: "Saving", balance: 12000 },
  ],
  accountDetails: [],
  budgetEntries: sampleBudgetEntries(),
  userProfile: {
    customBudgetCategories: ["transport", "pets", "holidays", "children"],
    hasResetFinancialData: true,
    monthlyTakeHome: 3400,
  },
};

const meta: Meta<typeof BudgetContainer> = {
  title: "5. Pages/Budget",
  component: BudgetContainer,
  parameters: { layout: "fullscreen", router: { loaderData } },
};

export default meta;
type Story = StoryObj<typeof BudgetContainer>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Overview: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Your budget")[0]).toBeDefined();
    await expect(within(canvasElement).getAllByText("Where you stand")[0]).toBeDefined();
  },
};

export const Empty: Story = {
  parameters: { router: { loaderData: { ...loaderData, budgetEntries: [] } } },
};
