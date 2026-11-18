import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { BudgetSetupWizard } from "./BudgetSetupWizard";

const meta: Meta<typeof BudgetSetupWizard> = {
  title: "3. Patterns/Budget/BudgetSetupWizard",
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

/** "Edit budget" on a saved budget: starts at Income, no welcome or example figures. */
export const EditMode: Story = {
  args: { mode: "edit" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Edit your budget")[0]).toBeDefined();
    await expect(canvas.getAllByText("Step 1 of 6")[0]).toBeDefined();
    await expect(canvas.queryByText("Set up your budget")).toBeNull();
  },
};

/**
 * "Add common budget items" on a budget that already has entries (the onboarding seed rows): the
 * saved rent shows as already in the budget, and only the missing items are added.
 */
export const AddMode: Story = {
  args: {
    mode: "add",
    entries: sampleBudgetEntries().filter((entry) => entry.category !== "bills"),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByRole("heading", { name: "Add common budget items" })[0],
    ).toBeDefined();
    await expect(canvas.getAllByText("Step 1 of 7")[0]).toBeDefined();
    await expect(canvas.queryByRole("button", { name: "Start blank" })).toBeNull();
    const add = canvas.getAllByRole("button", { name: /Add (these|this) item/ })[0];
    if (!add) throw new Error("Add button missing");
    await userEvent.click(add);
    await expect(args.onAddEntry).toHaveBeenCalled();
    await expect(args.onUpdateEntry).not.toHaveBeenCalled();
  },
};
