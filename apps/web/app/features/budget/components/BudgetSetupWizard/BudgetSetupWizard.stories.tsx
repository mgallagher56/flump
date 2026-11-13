import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { BudgetSetupWizard } from "./BudgetSetupWizard";

const meta: Meta<typeof BudgetSetupWizard> = {
  title: "3. Financial Patterns & Sections/Budget/BudgetSetupWizard",
  component: BudgetSetupWizard,
  parameters: { layout: "padded" },
  args: {
    entries: sampleBudgetEntries(),
    monthlyTakeHome: 3400,
    onUpdateEntry: fn().mockResolvedValue(undefined),
    onAddEntry: fn().mockResolvedValue(undefined),
    onDeleteEntry: fn().mockResolvedValue(undefined),
    onComplete: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BudgetSetupWizard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Welcome: Story = {};

export const IncomeStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = canvas.getAllByRole("button", { name: /Next/ })[0];
    if (!next) throw new Error("Next missing");
    await userEvent.click(next);
    const blank = (await canvas.findAllByRole("button", { name: "Start blank" }))[0];
    if (!blank) throw new Error("Start blank missing");
    await userEvent.click(blank);
    await expect((await canvas.findAllByText("Salary"))[0]).toBeDefined();
  },
};
