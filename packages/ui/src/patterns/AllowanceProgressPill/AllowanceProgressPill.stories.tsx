import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { AllowanceProgressPill } from "./AllowanceProgressPill";

const meta: Meta<typeof AllowanceProgressPill> = {
  title: "3. Financial Patterns & Sections/AllowanceProgressPill",
  component: AllowanceProgressPill,
  parameters: {
    layout: "centered",
  },
  args: {
    type: "isa",
    currentAmount: 14500,
  },
};

export default meta;
type Story = StoryObj<typeof AllowanceProgressPill>;

export const IsaAllowance: Story = {
  args: {
    type: "isa",
    currentAmount: 14500,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("UK ISA Annual Allowance")).toBeInTheDocument();
    await expect(canvas.getByText("£20,000 / Tax Year")).toBeInTheDocument();
  },
};

export const PensionAllowance: Story = {
  args: {
    type: "pension",
    currentAmount: 42000,
  },
};
