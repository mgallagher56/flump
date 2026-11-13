import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { BankStep } from "./BankStep";

const meta: Meta<typeof BankStep> = {
  title: "Onboarding/BankStep",
  component: BankStep,
  parameters: { layout: "padded" },
  args: { onBack: fn(), onSkip: fn() },
};
export default meta;
type Story = StoryObj<typeof BankStep>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Skip for now" }));
    await expect(args.onSkip).toHaveBeenCalledTimes(1);
  },
};
