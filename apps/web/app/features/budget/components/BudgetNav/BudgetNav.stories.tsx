import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { BudgetNav } from "./BudgetNav";

const meta: Meta<typeof BudgetNav> = {
  title: "3. Financial Patterns & Sections/Budget/BudgetNav",
  component: BudgetNav,
  parameters: { layout: "padded" },
  args: {
    activeTab: "dashboard",
    categoryTabs: ["housing", "bills", "expenses", "savings", "income", "holidays"],
    onSelectTab: fn(),
    onOpenRunway: fn(),
    onAddCategory: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BudgetNav>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const bills = within(canvasElement).getAllByRole("button", { name: "Bills" })[0];
    if (!bills) throw new Error("Bills tab missing");
    await userEvent.click(bills);
    await expect(args.onSelectTab).toHaveBeenCalledWith("bills");
  },
};

export const CategoryActive: Story = { args: { activeTab: "housing" } };
