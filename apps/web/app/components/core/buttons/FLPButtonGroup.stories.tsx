import type { Meta, StoryObj } from "@storybook/react";
import FLPButton from "./FLPButton";
import FLPButtonGroup from "./FLPButtonGroup";

const meta: Meta<typeof FLPButtonGroup> = {
  title: "Core/Buttons/FLPButtonGroup",
  component: FLPButtonGroup,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPButtonGroup>;

export const Default: Story = {
  args: {
    gap: "12px",
    children: (
      <>
        <FLPButton variant="primary">Save</FLPButton>
        <FLPButton variant="outline">Cancel</FLPButton>
      </>
    ),
  },
};

export const Attached: Story = {
  args: {
    attached: true,
    children: (
      <>
        <FLPButton variant="primary">Left</FLPButton>
        <FLPButton variant="secondary">Middle</FLPButton>
        <FLPButton variant="outline">Right</FLPButton>
      </>
    ),
  },
};
