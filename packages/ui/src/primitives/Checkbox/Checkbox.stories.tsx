import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Checkbox } from "./Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "2. Primitives/Checkbox",
  component: Checkbox,
  parameters: { layout: "padded" },
  args: { label: "Include overpayments in the plan" },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const box = canvas.getByRole("checkbox");
  await userEvent.tab();
  await expect(box).toHaveFocus();
  await userEvent.keyboard(" ");
  await expect(box).toBeChecked();
  await userEvent.keyboard(" ");
  await expect(box).not.toBeChecked();
};

export const Light: Story = {
  args: { hint: "Extra payments shorten your debt-free date" },
  globals: { theme: "light" },
  play,
};

export const Dark: Story = {
  args: { hint: "Extra payments shorten your debt-free date" },
  globals: { theme: "dark" },
  play,
};

export const Checked: Story = {
  args: { defaultChecked: true },
  globals: { theme: "light" },
};

export const CheckedDark: Story = {
  args: { defaultChecked: true },
  globals: { theme: "dark" },
};

export const Indeterminate: Story = {
  args: { indeterminate: true, label: "All accounts", hint: "2 of 3 selected" },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("checkbox")).toBePartiallyChecked();
  },
};

export const Disabled: Story = {
  render: (args) => (
    <div className={css({ display: "grid", gap: "2" })}>
      <Checkbox {...args} disabled label="Disabled, off" />
      <Checkbox {...args} defaultChecked disabled label="Disabled, on" />
    </div>
  ),
  globals: { theme: "dark" },
};

export const ErrorState: Story = {
  args: { invalid: true, label: "I have read the terms", hint: "You need to agree to continue" },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("checkbox")).toBeInvalid();
  },
};

export const LongContent: Story = {
  render: (args) => (
    <div className={css({ maxWidth: "300px" })}>
      <Checkbox
        {...args}
        hint="Your £1,250.00 monthly overpayment would be applied to the highest rate card first, so the Barclaycard Platinum balance of £4,310.27 clears before the next one"
        label="Apply my £1,250.00 monthly overpayment to the card with the highest rate, then roll the freed-up minimum payment into the next card"
      />
    </div>
  ),
  globals: { theme: "light" },
};
