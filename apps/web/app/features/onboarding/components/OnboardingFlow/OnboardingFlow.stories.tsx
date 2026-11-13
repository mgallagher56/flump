import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { OnboardingFlow } from "./OnboardingFlow";

const meta: Meta<typeof OnboardingFlow> = {
  title: "Onboarding/OnboardingFlow",
  component: OnboardingFlow,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof OnboardingFlow>;

export const Start: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "£45,000" }));
    await userEvent.selectOptions(canvas.getByLabelText(/where do you pay tax/i), "ENGLAND");
    await userEvent.click(canvas.getByRole("button", { name: /^next/i }));
    await expect(canvas.getByRole("heading", { level: 2, name: /housing/i })).toBeVisible();
  },
};

export const SkipEverything: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (let i = 0; i < 4; i++) {
      await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
    }
    await expect(canvas.getByRole("button", { name: /finish and open dashboard/i })).toBeDisabled();
    // Skipped steps are never shown as complete.
    const progress = canvas.getByRole("list", { name: "Setup progress" });
    await expect(within(progress).queryByText("Complete")).toBeNull();
    await expect(within(progress).getAllByText("Skipped")).toHaveLength(4);
  },
};

export const ActionError: Story = {
  args: { actionError: "We couldn't reach the server. Please try again." },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toBeVisible();
  },
};
