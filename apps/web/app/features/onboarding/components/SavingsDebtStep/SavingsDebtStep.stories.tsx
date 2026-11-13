import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { StepHarness } from "../../testing";
import { SavingsDebtStep } from "./SavingsDebtStep";

const meta: Meta<typeof SavingsDebtStep> = {
  title: "Onboarding/SavingsDebtStep",
  component: SavingsDebtStep,
  parameters: { layout: "padded" },
  args: { onBack: fn(), onNext: fn(), onSkip: fn() },
  render: (args) => (
    <StepHarness>
      {({ values, update }) => <SavingsDebtStep {...args} update={update} values={values} />}
    </StepHarness>
  ),
};
export default meta;
type Story = StoryObj<typeof SavingsDebtStep>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/cash and isa savings/i), "5000");
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
    await expect(args.onSkip).toHaveBeenCalled();
  },
};
