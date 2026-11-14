import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { StepFrame } from "./StepFrame";

const meta: Meta<typeof StepFrame> = {
  title: "3. Patterns/Onboarding/StepFrame",
  component: StepFrame,
  parameters: { layout: "padded" },
  args: {
    id: "story",
    title: "Housing",
    description: "Regular costs for a monthly picture.",
    onBack: fn(),
    onSkip: fn(),
    onNext: fn(),
    children: "Fields go here.",
  },
};
export default meta;
type Story = StoryObj<typeof StepFrame>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Skip this step" }));
    await expect(args.onSkip).toHaveBeenCalledTimes(1);
  },
};
