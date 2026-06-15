import type { Meta, StoryObj } from "@storybook/react";
import FLPText from "./FLPText";

const meta: Meta<typeof FLPText> = {
  title: "Core/Typography/FLPText",
  component: FLPText,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPText>;

export const Default: Story = {
  args: {
    children:
      "This is a basic paragraph styled with the FLPText component. It supports various font sizes, weights, and letter spacings.",
    fontSize: "md",
  },
};

export const Large: Story = {
  args: {
    children: "Large text size",
    fontSize: "lg",
    fontWeight: "semibold",
  },
};

export const Muted: Story = {
  args: {
    children: "This text uses a muted gray color.",
    color: "text.muted",
    fontSize: "sm",
  },
};
