import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { OnboardingHeader } from "./OnboardingHeader";

const meta: Meta<typeof OnboardingHeader> = {
  title: "Onboarding/OnboardingHeader",
  component: OnboardingHeader,
  parameters: { layout: "padded" },
  args: { onSaveAndExit: fn() },
};
export default meta;
type Story = StoryObj<typeof OnboardingHeader>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Save and exit" }));
    await expect(args.onSaveAndExit).toHaveBeenCalledTimes(1);
  },
};

export const Saving: Story = { args: { isSaving: true } };
