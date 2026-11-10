import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Button } from "../../primitives/Button/Button";
import { PageHeader } from "./PageHeader";

const meta: Meta<typeof PageHeader> = {
  title: "3. Financial Patterns & Sections/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  args: {
    title: "Debt Payoff & Recovery",
    subtitle:
      "Model mathematically optimal clearance strategies, defuse promotional cliffs, and bridge liabilities into long-term ISA wealth.",
    actions: <Button size="sm">Add Liability</Button>,
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Debt Payoff & Recovery")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Add Liability" })).toBeInTheDocument();
  },
};
