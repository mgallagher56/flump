import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MortgageWidget } from "./MortgageWidget";

const meta: Meta<typeof MortgageWidget> = {
  title: "3. Financial Patterns & Sections/MortgageWidget",
  component: MortgageWidget,
  parameters: { layout: "padded" },
  args: {
    data: {
      mortgageBalance: 200000,
      interestRate: 4.2,
      remainingTermYears: 22,
      hasMortgageAccount: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof MortgageWidget>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const RateAndTermKnown: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("4.20%")[0]).toBeDefined();
  },
};

/** Unknown rate and term: "Not set" with a link, never an invented payment. */
export const NotSet: Story = {
  args: {
    data: {
      mortgageBalance: 200000,
      interestRate: null,
      remainingTermYears: null,
      hasMortgageAccount: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Not set")[0]).toBeDefined();
    await expect(
      canvas.getAllByRole("link", { name: "Add rate and term" })[0]?.getAttribute("href"),
    ).toBe("/app/mortgage");
  },
};
