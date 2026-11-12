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

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
};
