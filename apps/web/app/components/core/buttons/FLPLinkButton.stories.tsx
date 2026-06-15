import type { Meta, StoryObj } from "@storybook/react";
import FLPLinkButton from "./FLPLinkButton";

const meta: Meta<typeof FLPLinkButton> = {
  title: "Core/Buttons/FLPLinkButton",
  component: FLPLinkButton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPLinkButton>;

export const Default: Story = {
  args: {
    to: "/dashboard",
    text: "Go to Dashboard",
  },
};
