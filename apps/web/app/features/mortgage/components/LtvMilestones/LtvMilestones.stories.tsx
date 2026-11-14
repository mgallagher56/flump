import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LtvMilestones } from "./LtvMilestones";

const meta: Meta<typeof LtvMilestones> = {
  title: "3. Patterns/Mortgage/LtvMilestones",
  component: LtvMilestones,
  parameters: { layout: "padded" },
  args: {
    currentLtv: 80,
    loanAmount: 160000,
    propertyValue: 200000,
    ownershipSharePct: 100,
    milestones: [
      { targetLtvPct: 90, isAchieved: true, lumpSumNeededGbp: 0 },
      {
        targetLtvPct: 75,
        isAchieved: false,
        lumpSumNeededGbp: 15000,
        requiredMonthlyOverpaymentBeforeFixGbp: 250,
      },
    ],
    onModelOverpayment: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof LtvMilestones>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getAllByRole("button", { name: /^Model/ })[0];
    if (!button) throw new Error("Apply button missing");
    await userEvent.click(button);
    await expect(args.onModelOverpayment).toHaveBeenCalledWith(250);
  },
};

/** Every band already reached: one row, not four that read the same. */
export const AllWithin: Story = {
  args: {
    currentLtv: 38.7,
    loanAmount: 135400,
    propertyValue: 350000,
    milestones: [90, 85, 75, 60].map((targetLtvPct) => ({
      targetLtvPct,
      isAchieved: true,
      lumpSumNeededGbp: 0,
    })),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("[data-list-row]")).toHaveLength(1);
    await expect(canvasElement.textContent).not.toMatch(/Share you own/);
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
