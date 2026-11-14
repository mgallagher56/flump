import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { ChartTooltipContent } from "./ChartTooltipContent";

const meta: Meta<typeof ChartTooltipContent> = {
  title: "4. Charts/ChartTooltipContent",
  component: ChartTooltipContent,
  parameters: { layout: "padded" },
  args: {
    title: "Mar 2026",
    rows: [
      { id: "assets", label: "Net worth", color: "primary", value: 48250 },
      { id: "savings", label: "Savings", color: "wealth", value: 14300 },
      { id: "debt", label: "Debt", color: "debt", value: -6200.5 },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof ChartTooltipContent>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Mar 2026")).toBeInTheDocument();
    await expect(canvas.getByText("£48,250")).toBeInTheDocument();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
  },
};

export const Projection: Story = {
  args: {
    title: "Jun 2026 (projected)",
    rows: [
      { id: "assets", label: "Net worth", color: "projection", swatch: "dashed", value: 52100 },
    ],
  },
};

export const NotSetAndLongLabel: Story = {
  args: {
    title: "Wednesday 12 March 2026",
    rows: [
      { id: "a", label: "Workplace pension, estimated", color: "accentPurple", value: null },
      { id: "b", label: "Everyday credit card", color: "debt", value: -1860.75 },
    ],
    fractionDigits: 2,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Not set")).toBeInTheDocument();
    await expect(canvas.getByText("-£1,860.75")).toBeInTheDocument();
  },
};

export const Dark: Story = { ...Default, globals: { theme: "dark" } };
