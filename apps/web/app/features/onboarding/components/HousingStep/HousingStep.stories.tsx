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

export const NotAnswered: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const radio of canvas.getAllByRole("radio")) await expect(radio).not.toBeChecked();
    await expect(canvas.queryByLabelText(/monthly rent/i)).toBeNull();
  },
};

export const Renting: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /renting/i }));
    await expect(canvas.getByLabelText(/monthly rent/i)).toBeVisible();
  },
};

export const Mortgage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /paying a mortgage/i }));
    await expect(canvas.getByRole("radio", { name: /paying a mortgage/i })).toBeChecked();
    await expect(canvas.getByLabelText(/mortgage left to pay/i)).toBeVisible();
  },
};

export const LivingWithFamily: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: /living with family or friends/i }));
    await expect(canvas.getByLabelText(/what you pay each month \(optional\)/i)).toBeVisible();
    await expect(canvas.queryByLabelText(/what your home is worth/i)).toBeNull();
  },
};
