import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PayRiseTool } from "./PayRiseTool";

const meta: Meta<typeof PayRiseTool> = {
  title: "5. Calculators/Take-home/PayRiseTool",
  component: PayRiseTool,
  parameters: { layout: "padded" },
  args: {
    salaryIncrease: 5000,
    monthlyIncrease: 230,
    onSalaryIncreaseChange: fn(),
    onApplyIncrease: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PayRiseTool>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("+£230")[0]).toBeDefined();
    const button = canvas.getAllByRole("button", { name: "Model this in savings" })[0];
    if (!button) throw new Error("Button missing");
    await userEvent.click(button);
    await expect(args.onApplyIncrease).toHaveBeenCalledWith(230);
  },
};

export const NoRise: Story = {
  args: { salaryIncrease: 0, monthlyIncrease: 0 },
};
