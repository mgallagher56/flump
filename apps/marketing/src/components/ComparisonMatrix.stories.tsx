import type { Meta, StoryObj } from "@storybook/react";
import { ComparisonMatrix } from "./ComparisonMatrix";

const meta: Meta<typeof ComparisonMatrix> = {
  title: "Marketing/ComparisonMatrix",
  component: ComparisonMatrix,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ComparisonMatrix>;

export const Default: Story = {};
