import type { Meta, StoryObj } from "@storybook/react";
import { HomeFAQ } from "./HomeFAQ";

const meta: Meta<typeof HomeFAQ> = {
  title: "Marketing/HomeFAQ",
  component: HomeFAQ,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof HomeFAQ>;

export const Default: Story = {};
