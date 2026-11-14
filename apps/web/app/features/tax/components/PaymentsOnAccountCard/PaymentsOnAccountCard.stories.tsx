import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { PaymentsOnAccountCard } from "./PaymentsOnAccountCard";

/** The Storybook preview renders every story side by side in light and dark. */
const meta: Meta<typeof PaymentsOnAccountCard> = {
  title: "Tax/PaymentsOnAccountCard",
  component: PaymentsOnAccountCard,
  tags: ["autodocs"],
  args: { annualSelfAssessmentTax: 4800, taxYear: "2026/27" },
};

export default meta;
type Story = StoryObj<typeof PaymentsOnAccountCard>;

export const WithPaymentsOnAccount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Due 31 January 2028")).toBeTruthy();
    await expect(canvas.getByText("Due 31 July 2028")).toBeTruthy();
  },
};

export const UnderThreshold: Story = {
  args: { annualSelfAssessmentTax: 800 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("One payment for this year's bill")).toBeTruthy();
  },
};
