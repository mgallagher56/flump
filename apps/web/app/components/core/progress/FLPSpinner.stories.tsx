import type { Meta, StoryObj } from "@storybook/react";
import FLPSpinner from "./FLPSpinner";

const meta: Meta<typeof FLPSpinner> = {
  title: "Core/Progress/FLPSpinner",
  component: FLPSpinner,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof FLPSpinner>;

export const Default: Story = {
  args: {
    size: "md",
  },
};

export const Sizing: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <FLPSpinner size="xs" />
      <FLPSpinner size="sm" />
      <FLPSpinner size="md" />
      <FLPSpinner size="lg" />
      <FLPSpinner size="xl" />
    </div>
  ),
};

export const WithLabel: Story = {
  args: {
    size: "md",
    children: <span>Loading data...</span>,
  },
};
