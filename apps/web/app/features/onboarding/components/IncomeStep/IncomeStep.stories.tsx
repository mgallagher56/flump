import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { StepHarness } from "../../testing";
import { IncomeStep } from "./IncomeStep";

const meta: Meta<typeof IncomeStep> = {
  title: "Onboarding/IncomeStep",
  component: IncomeStep,
  parameters: { layout: "padded" },
  args: { onNext: fn(), onSkip: fn() },
  render: (args) => (
    <StepHarness>
      {({ values, update }) => <IncomeStep {...args} update={update} values={values} />}
    </StepHarness>
  ),
};
export default meta;
type Story = StoryObj<typeof IncomeStep>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "£45,000" }));
    await expect(canvas.getByRole("textbox", { name: /^annual gross salary/i })).toHaveValue(
      "45,000",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Skip for now" }));
    await expect(args.onSkip).toHaveBeenCalled();
  },
};

export const TakeHomeMode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /take-home after tax/i }));
    await expect(canvas.getByRole("radio", { name: /take-home after tax/i })).toBeChecked();
    await expect(canvas.getByRole("textbox", { name: /monthly take-home pay/i })).toBeVisible();
  },
};

/** Arrived from the review's "Go to You and income": the empty required fields are flagged. */
export const ShowMissing: Story = {
  args: { showMissing: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("textbox", { name: /^annual gross salary/i })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(canvas.getByText("Choose where you pay tax")).toBeVisible();
  },
};
