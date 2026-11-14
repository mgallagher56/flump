import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { sampleBudgetEntries } from "../../sampleBudgetEntries";
import { BudgetOverview } from "./BudgetOverview";

const meta: Meta<typeof BudgetOverview> = {
  title: "3. Patterns/Budget/BudgetOverview",
  component: BudgetOverview,
  parameters: { layout: "padded" },
  args: { entries: sampleBudgetEntries() },
};

export default meta;
type Story = StoryObj<typeof BudgetOverview>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Left over each month")[0]).toBeDefined();
    await expect(canvas.getAllByText("Money in each month")[0]).toBeDefined();
    await expect(canvas.getAllByText("Going out each month")[0]).toBeDefined();
  },
};

/** Short each month: the same colours as any other month, no alarm and no list of services. */
export const ShortEachMonth: Story = {
  args: {
    entries: sampleBudgetEntries().map((e) => (e.id === "i1" ? { ...e, amount: 1800 } : e)),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Short each month")[0]).toBeDefined();
  },
};

/** With saved pay details, safe to spend comes from take-home (owner decision D-6-A). */
export const WithTakeHome: Story = {
  args: {
    picture: buildWorkspacePicture({
      userProfile: {
        annualSalary: 38000,
        employmentType: "employed",
        taxRegion: "ENGLAND",
        studentLoanPlans: [],
        pensionPercent: 5,
        isSalarySacrifice: false,
      },
      budgetEntries: sampleBudgetEntries(),
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText(/a week is safe to spend after essential spending/)[0],
    ).toBeDefined();
  },
};
