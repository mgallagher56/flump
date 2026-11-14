import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { PensionWidget } from "./PensionWidget";

const meta: Meta<typeof PensionWidget> = {
  title: "3. Patterns/Dashboard/PensionWidget",
  component: PensionWidget,
  parameters: { layout: "padded" },
  args: {
    data: { totalPensionBalance: 30000, potsCount: 2, employeePercent: 5, employerPercent: 3 },
  },
};

export default meta;
type Story = StoryObj<typeof PensionWidget>;

export const PotTotal: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("£30,000")[0]).toBeDefined();
  },
};

export const ContributionRate: Story = {
  args: { potInStrip: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText("8%")[0]).toBeDefined();
  },
};
