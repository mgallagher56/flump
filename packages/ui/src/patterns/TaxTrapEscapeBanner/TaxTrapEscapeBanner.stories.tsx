import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { TaxTrapEscapeBanner } from "./TaxTrapEscapeBanner";

const meta: Meta<typeof TaxTrapEscapeBanner> = {
  title: "3. Financial Patterns & Sections/TaxTrapEscapeBanner",
  component: TaxTrapEscapeBanner,
  parameters: {
    layout: "padded",
  },
  args: {
    grossIncome: 112000,
  },
};

export default meta;
type Story = StoryObj<typeof TaxTrapEscapeBanner>;

export const InTrap: Story = {
  args: {
    grossIncome: 115000,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Income in the £100,000 to £125,140 band")).toBeInTheDocument();
  },
};

export const Approaching: Story = {
  args: {
    grossIncome: 98000,
  },
};
