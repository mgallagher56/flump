import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { TakeHomeBreakdown } from "./TakeHomeBreakdown";

const meta: Meta<typeof TakeHomeBreakdown> = {
  title: "3. Patterns/Take-home/TakeHomeBreakdown",
  component: TakeHomeBreakdown,
  parameters: { layout: "padded" },
  args: {
    salary: 45000,
    incomeTax: 6486,
    nationalInsurance: 2594,
    pension: 2250,
    studentLoan: 0,
  },
};

export default meta;
type Story = StoryObj<typeof TakeHomeBreakdown>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Where your pay goes")[0]).toBeDefined();
    await expect(canvas.getAllByText("Take-home pay")[0]).toBeDefined();
    await expect(canvas.getAllByText("Tax, National Insurance and pension")[0]).toBeDefined();
  },
};

export const WithStudentLoan: Story = {
  args: { studentLoan: 1400 },
};
