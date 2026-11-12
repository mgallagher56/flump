import type { Meta, StoryObj } from "@storybook/react";
import { SecurityPrivacySection } from "./SecurityPrivacySection";

const meta: Meta<typeof SecurityPrivacySection> = {
  title: "Marketing/SecurityPrivacySection",
  component: SecurityPrivacySection,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SecurityPrivacySection>;

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
};
