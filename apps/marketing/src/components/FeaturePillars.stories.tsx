import type { Meta, StoryObj } from "@storybook/react";
import { FeaturePillars } from "./FeaturePillars";

const meta: Meta<typeof FeaturePillars> = {
  title: "Marketing/FeaturePillars",
  component: FeaturePillars,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof FeaturePillars>;

export const Default: Story = {};
