import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { BudgetOverview } from "./BudgetOverview";

const meta: Meta<typeof BudgetOverview> = {
  title: "3. Financial Patterns & Sections/Budget/BudgetOverview",
  component: BudgetOverview,
  parameters: { layout: "padded" },
  args: {
    entries: sampleBudgetEntries(),
    customCategories: ["transport", "pets", "holidays", "children"],
    onNavigateToCategory: fn(),
    onNavigateToRunway: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BudgetOverview>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Where you stand")[0]).toBeDefined();
    const runway = canvas.getAllByRole("button", { name: "See your runway" })[0];
    if (!runway) throw new Error("Runway button missing");
    await userEvent.click(runway);
    await expect(args.onNavigateToRunway).toHaveBeenCalled();
  },
};

export const Deficit: Story = {
  args: {
    entries: sampleBudgetEntries().map((e) => (e.id === "i1" ? { ...e, amount: 1800 } : e)),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText("Your budget spends more than you bring in")[0],
    ).toBeDefined();
  },
};

export const FewCategories: Story = {
  args: { entries: sampleBudgetEntries().slice(0, 6), customCategories: [] },
};
