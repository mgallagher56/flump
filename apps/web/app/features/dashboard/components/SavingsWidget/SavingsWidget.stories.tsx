import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { SavingsWidget } from "./SavingsWidget";

const meta: Meta<typeof SavingsWidget> = {
  title: "3. Financial Patterns & Sections/SavingsWidget",
  component: SavingsWidget,
  parameters: { layout: "padded" },
  args: { data: { totalSavingsBalance: 12000, accountsCount: 2 } },
};

export default meta;
type Story = StoryObj<typeof SavingsWidget>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("£12,000")[0]).toBeDefined();
  },
};

export const Empty: Story = { args: { data: { totalSavingsBalance: 0, accountsCount: 0 } } };
