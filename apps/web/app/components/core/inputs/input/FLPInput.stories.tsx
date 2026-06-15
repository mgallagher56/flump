import type { Meta, StoryObj } from "@storybook/react";
import FLPInput from "./FLPInput";

const meta: Meta<typeof FLPInput> = {
  title: "Core/Inputs/FLPInput",
  component: FLPInput,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPInput>;

export const Default: Story = {
  args: {
    label: "Username",
    placeholder: "Enter username...",
  },
};

export const WithError: Story = {
  args: {
    label: "Email Address",
    value: "invalid-email",
    error: "Please enter a valid email address.",
  },
};

export const RowLayout: Story = {
  args: {
    label: "Search",
    flexDirection: "row",
    placeholder: "Search transactions...",
  },
};

export const LabelHidden: Story = {
  args: {
    label: "Hidden Label",
    isLabelHidden: true,
    placeholder: "No label displayed",
  },
};
