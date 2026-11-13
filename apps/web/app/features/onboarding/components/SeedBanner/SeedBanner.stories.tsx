import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { SeedBanner } from "./SeedBanner";

const meta: Meta<typeof SeedBanner> = {
  title: "Onboarding/SeedBanner",
  component: SeedBanner,
  parameters: { layout: "padded" },
  args: {
    hasNumbers: true,
    canFinish: true,
    missingForFinish: null,
    isSubmitting: false,
    salary: 75000,
    onLaunch: fn(),
    onReview: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof SeedBanner>;

export const Ready: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /finish with these numbers/i }),
    );
    await expect(args.onLaunch).toHaveBeenCalled();
  },
};

export const MissingIncome: Story = {
  args: { canFinish: false, missingForFinish: "Enter your income and choose where you pay tax" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: /finish with these numbers/i }),
    ).toBeDisabled();
  },
};
