import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MortgageWidget } from "./MortgageWidget";

const meta: Meta<typeof MortgageWidget> = {
  title: "3. Patterns/Dashboard/MortgageWidget",
  component: MortgageWidget,
  parameters: { layout: "padded" },
  args: { data: { mortgageBalance: 186000, hasMortgageAccount: true } },
};

export default meta;
type Story = StoryObj<typeof MortgageWidget>;

export const Populated: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("£186,000")[0]).toBeDefined();
  },
};

export const NoMortgage: Story = {
  args: { data: { mortgageBalance: 0, hasMortgageAccount: false } },
};
