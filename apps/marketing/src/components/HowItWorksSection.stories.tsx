import type { Meta, StoryObj } from "@storybook/react";
import { HowItWorksSection } from "./HowItWorksSection";

const meta: Meta<typeof HowItWorksSection> = {
  title: "Marketing/HowItWorksSection",
  component: HowItWorksSection,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof HowItWorksSection>;

export const Default: Story = {};
