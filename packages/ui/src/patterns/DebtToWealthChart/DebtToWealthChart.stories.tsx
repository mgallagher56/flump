import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { DebtToWealthChart } from "./DebtToWealthChart";

const meta: Meta<typeof DebtToWealthChart> = {
  title: "4. Charts/DebtToWealthChart",
  component: DebtToWealthChart,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof DebtToWealthChart>;

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Example: after the debts are paid off")).toBeInTheDocument();
  },
};
