import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { StepHarness } from "../../testing";
import { HousingStep } from "./HousingStep";

const meta: Meta<typeof HousingStep> = {
  title: "Onboarding/HousingStep",
  component: HousingStep,
  parameters: { layout: "padded" },
  args: { onBack: fn(), onNext: fn(), onSkip: fn() },
  render: (args) => (
    <StepHarness>
      {({ values, update }) => (
        <HousingStep
          {...args}
          setHousingStatus={(housingStatus) => update({ housingStatus })}
          update={update}
          values={values}
        />
      )}
    </StepHarness>
  ),
};
export default meta;
type Story = StoryObj<typeof HousingStep>;

export const Renting: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText(/monthly rent/i)).toBeVisible();
  },
};

export const Mortgage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /mortgage/i }));
    await expect(canvas.getByRole("radio", { name: /mortgage/i })).toBeChecked();
    await expect(canvas.getByLabelText(/mortgage balance/i)).toBeVisible();
  },
};
