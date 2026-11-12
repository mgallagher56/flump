import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { CurrencyInput } from "./CurrencyInput";
import { TextInput } from "./TextInput";

const onChange = fn();
const onValueChange = fn();

const meta: Meta<typeof TextInput> = {
  title: "2. Primitives/TextInput",
  component: TextInput,
  parameters: { layout: "padded" },
  args: { "aria-label": "Employer name", placeholder: "Acme Ltd", onChange },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText("Employer name");
  await userEvent.type(input, "Acme");
  await expect(onChange).toHaveBeenCalled();
  await expect(input).toHaveValue("Acme");
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

export const Invalid: Story = {
  args: { invalid: true, defaultValue: "???" },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText("Employer name")).toBeInvalid();
  },
};

export const Small: Story = { args: { size: "sm" }, globals: { theme: "light" } };

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Locked" },
  globals: { theme: "dark" },
};

export const Percentage: Story = {
  args: { "aria-label": "Interest rate", suffix: "%", inputMode: "decimal", placeholder: "4.5" },
  globals: { theme: "light" },
};

const currencyPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText("Savings balance");
  await userEvent.type(input, "1,234.5");
  await expect(onValueChange).toHaveBeenLastCalledWith(1234.5);
  await userEvent.clear(input);
  await expect(onValueChange).toHaveBeenLastCalledWith(null);
};

export const Currency: Story = {
  render: () => <CurrencyInput aria-label="Savings balance" onValueChange={onValueChange} />,
  globals: { theme: "light" },
  play: currencyPlay,
};

export const CurrencyDark: Story = {
  render: () => <CurrencyInput aria-label="Savings balance" onValueChange={onValueChange} />,
  globals: { theme: "dark" },
  play: currencyPlay,
};
