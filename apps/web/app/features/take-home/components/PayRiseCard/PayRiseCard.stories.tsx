import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PayRiseCard } from "./PayRiseCard";

const meta: Meta<typeof PayRiseCard> = {
  title: "3. Financial Patterns & Sections/Take-home/PayRiseCard",
  component: PayRiseCard,
  parameters: { layout: "padded" },
  args: {
    salaryIncrease: 5000,
    monthlyIncrease: 230,
    onSalaryIncreaseChange: fn(),
    onApplyIncrease: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PayRiseCard>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: "Model this in the savings forecaster" })[0],
    );
    await expect(args.onApplyIncrease).toHaveBeenCalledWith(230);
  },
};
