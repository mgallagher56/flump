import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { PromoCliffTracker } from "./PromoCliffTracker";

const meta: Meta<typeof PromoCliffTracker> = {
  title: "3. Financial Patterns & Sections/PromoCliffTracker",
  component: PromoCliffTracker,
  parameters: {
    layout: "padded",
  },
  args: {
    alerts: [
      {
        debtId: "d1",
        debtName: "Barclaycard Platinum 0%",
        promoExpiryDate: "28 Nov 2025",
        projectedBalanceAtExpiryGbp: 2400,
        revertApr: 24.9,
        requiredMonthlyToClearBeforeCliff: 200,
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof PromoCliffTracker>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("0% Promotional Balance Expiry Warning")).toBeInTheDocument();
  },
};
