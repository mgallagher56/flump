import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Switch } from "./Switch";

const meta: Meta<typeof Switch> = {
  title: "2. Primitives/Switch",
  component: Switch,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className={css({ maxWidth: "380px" })}>
        <Story />
      </div>
    ),
  ],
  args: { label: "Email me a monthly summary" },
};

export default meta;
type Story = StoryObj<typeof Switch>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const sw = canvas.getByRole("switch");
  await userEvent.tab();
  await expect(sw).toHaveFocus();
  await expect(sw).not.toBeChecked();
  await userEvent.keyboard(" ");
  await expect(sw).toBeChecked();
  await userEvent.keyboard(" ");
  await expect(sw).not.toBeChecked();
};

export const Light: Story = {
  args: { hint: "Sent on the first of each month" },
  globals: { theme: "light" },
  play,
};

export const Dark: Story = {
  args: { hint: "Sent on the first of each month" },
  globals: { theme: "dark" },
  play,
};

export const On: Story = { args: { defaultChecked: true }, globals: { theme: "light" } };

export const OnDark: Story = { args: { defaultChecked: true }, globals: { theme: "dark" } };

export const Disabled: Story = {
  render: (args) => (
    <div className={css({ display: "grid", gap: "2" })}>
      <Switch {...args} disabled label="Disabled, off" />
      <Switch {...args} defaultChecked disabled label="Disabled, on" />
    </div>
  ),
  globals: { theme: "dark" },
};

export const LongContent: Story = {
  args: {
    label: "Tell me when any of my four credit cards is within £250.00 of its limit",
    hint: "We check balances every night at 02:00 and send one email per day at most, never more",
  },
  globals: { theme: "light" },
};
