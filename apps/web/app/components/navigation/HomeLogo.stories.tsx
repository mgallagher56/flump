import type { Meta, StoryObj } from "@storybook/react";
import HomeLogo from "./HomeLogo";

const meta: Meta<typeof HomeLogo> = {
  title: "Navigation/HomeLogo",
  component: HomeLogo,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof HomeLogo>;

export const Default: Story = {};
