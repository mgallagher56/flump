import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { OnboardingHeader } from "./OnboardingHeader";

const meta: Meta<typeof OnboardingHeader> = {
  title: "Onboarding/OnboardingHeader",
  component: OnboardingHeader,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof OnboardingHeader>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { level: 1 })).toBeDefined();
  },
};
