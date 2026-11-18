import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { HomeEquityLine } from "./HomeEquityLine";

const meta: Meta<typeof HomeEquityLine> = {
  title: "3. Patterns/Mortgage/HomeEquityLine",
  component: HomeEquityLine,
  parameters: { layout: "padded" },
  args: { homeValue: 300000, mortgageBalance: 200000, sharePercent: null },
};

export default meta;
type Story = StoryObj<typeof HomeEquityLine>;

export const Sole: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Your equity")).toBeTruthy();
    await expect(canvasElement.textContent).toContain("£100,000");
  },
};

export const Joint: Story = {
  args: { homeValue: 350000, mortgageBalance: 125000, sharePercent: 40 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toContain("At your 40% share");
  },
};

/** Shown neutrally: a minus sign in the normal text colour. */
export const Negative: Story = {
  args: { homeValue: 180000, mortgageBalance: 195000 },
};

export const NoMortgage: Story = {
  args: { homeValue: 275000, mortgageBalance: null },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const DarkJointNegative: Story = {
  args: { homeValue: 180000, mortgageBalance: 195000, sharePercent: 50 },
  globals: { theme: "dark" },
};
