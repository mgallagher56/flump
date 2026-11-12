import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { BtlOverview } from "./BtlOverview";

const meta: Meta<typeof BtlOverview> = {
  title: "3. Financial Patterns & Sections/BtlOverview",
  component: BtlOverview,
  parameters: { layout: "padded" },
  args: {
    propertyCount: 2,
    monthlyRent: 1200,
    grossYield: 5.76,
    monthlyPayment: 480,
    mortgageType: "interest-only",
    onConfigure: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BtlOverview>;

export const Populated: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getAllByRole("button", {
      name: /Configure in profile/,
    })[0];
    if (!button) throw new Error("Configure button missing");
    await userEvent.click(button);
    await expect(args.onConfigure).toHaveBeenCalled();
  },
};

export const NotSet: Story = {
  args: { monthlyRent: 0, grossYield: null, monthlyPayment: null, propertyCount: 1 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("Not set").length).toBeGreaterThan(0);
  },
};
