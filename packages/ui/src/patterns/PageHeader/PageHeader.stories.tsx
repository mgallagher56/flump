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
    title: "Debt payoff",
    description: "See how extra payments change your payoff date and the interest you pay.",
    actions: <Button size="sm">Add debt</Button>,
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Debt payoff" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Add debt" })).toBeInTheDocument();
  },
};

export const SampleDataBadge: Story = {
  args: {
    title: "Home",
    description: "Where you stand this month. Sample data.",
    badge: "Sample data",
    actions: undefined,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Sample data")).toBeInTheDocument();
  },
};

export const TitleOnly: Story = {
  args: { description: undefined, actions: undefined },
};

export const LongContent: Story = {
  args: {
    title: "Mortgage overpayment and remortgage planning for 2026/27",
    description:
      "Compare overpaying with saving, test a higher renewal rate and see what each choice does to your balance, monthly payment and total interest over the term.",
    badge: "Sample data",
  },
};
