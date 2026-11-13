import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "2. Primitives/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { shape: "text", lines: 3 },
};

export const Shapes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
      <Skeleton shape="line" />
      <Skeleton shape="text" lines={3} />
      <Skeleton shape="block" size="sm" />
      <Skeleton shape="circle" size="md" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Skeleton shape="circle" size="sm" />
      <Skeleton shape="circle" size="md" />
      <Skeleton shape="circle" size="lg" />
    </div>
  ),
};

export const WithLabel: Story = {
  args: { shape: "block", size: "md", label: "Loading your debts" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Loading your debts")).toBeInTheDocument();
  },
};

export const Dark: Story = { ...Shapes, globals: { theme: "dark" } };
