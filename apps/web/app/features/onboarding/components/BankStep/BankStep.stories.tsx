import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { BankStep } from "./BankStep";

const meta: Meta<typeof BankStep> = {
  title: "Onboarding/BankStep",
  component: BankStep,
  parameters: { layout: "padded" },
  args: { onBack: fn(), onNext: fn() },
};
export default meta;
type Story = StoryObj<typeof BankStep>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: /^next/i }));
    await expect(args.onNext).toHaveBeenCalledTimes(1);
  },
};
