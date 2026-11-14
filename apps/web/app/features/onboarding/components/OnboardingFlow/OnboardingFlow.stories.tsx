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
    await userEvent.click(canvas.getByRole("button", { name: /^next/i }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip this step" }));
    await userEvent.click(canvas.getByRole("button", { name: "Skip this step" }));
    // From the bank step, jump to the review from the stepper.
    const steps = canvas.getByRole("list", { name: "Setup progress" });
    await userEvent.click(within(steps).getByRole("button", { name: /Step 5 of 5: Review/ }));
    await expect(canvas.getByRole("button", { name: /finish and open dashboard/i })).toBeDisabled();
    // Skipped steps are never shown as complete; only income was left with Next.
    const progress = canvas.getByRole("list", { name: "Setup progress" });
    await expect(within(progress).getAllByText("Complete")).toHaveLength(1);
    await expect(within(progress).getAllByText("Skipped")).toHaveLength(3);
  },
};

export const ActionError: Story = {
  args: { actionError: "We could not reach the server. Try again." },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toBeVisible();
  },
};
