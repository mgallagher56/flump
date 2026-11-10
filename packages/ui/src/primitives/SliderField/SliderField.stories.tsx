import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { SliderField } from "./SliderField";

const meta: Meta<typeof SliderField> = {
  title: "2. Primitives/SliderField",
  component: SliderField,
  parameters: {
    layout: "centered",
  },
  args: {
    label: "Monthly Debt Overpayment",
    value: 50,
    min: 0,
    max: 500,
    step: 10,
    unitPrefix: "£",
    unitSuffix: "/mo",
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SliderField>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText("Monthly Debt Overpayment");
    await expect(label).toBeInTheDocument();

    const input = canvas.getByLabelText("Monthly Debt Overpayment input");
    await userEvent.clear(input);
    await userEvent.type(input, "150");
    await expect(args.onChange).toHaveBeenCalledWith(150);
  },
};

export const Percentage: Story = {
  args: {
    label: "Salary Sacrifice %",
    value: 8,
    min: 0,
    max: 50,
    step: 0.5,
    unitPrefix: "",
    unitSuffix: "%",
  },
};
