import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LtvMilestones } from "./LtvMilestones";

const meta: Meta<typeof LtvMilestones> = {
  title: "3. Financial Patterns & Sections/LtvMilestones",
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
