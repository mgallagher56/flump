import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { CurrencyInput } from "../TextInput/CurrencyInput";
import { TextInput } from "../TextInput/TextInput";
import { controlProps, FormField } from "./FormField";

const meta: Meta<typeof FormField> = {
  title: "2. Primitives/FormField",
  component: FormField,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof FormField>;

const Basic = () => (
  <FormField hint="As shown on your latest statement" label="Account nickname" required>
    {(field) => <TextInput {...controlProps(field)} placeholder="Joint current account" />}
  </FormField>
);

const basicPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText(/Account nickname/);
  await userEvent.tab();
  await expect(input).toHaveFocus();
  await userEvent.type(input, "Holiday fund");
  await expect(input).toHaveValue("Holiday fund");
  await expect(input).toHaveAccessibleDescription("As shown on your latest statement");
};

export const Light: Story = {
  render: () => <Basic />,
  globals: { theme: "light" },
  play: basicPlay,
};

export const Dark: Story = { render: () => <Basic />, globals: { theme: "dark" }, play: basicPlay };

const WithError = () => (
  <FormField error="Enter a balance of £0 or more" hint="Whole pounds are fine" label="Balance">
    {(field) => <CurrencyInput {...controlProps(field)} value={-5} />}
  </FormField>
);

const errorPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText("Balance");
  await expect(input).toBeInvalid();
  await expect(canvas.getByRole("alert")).toHaveTextContent("Enter a balance of £0 or more");
  await expect(input).toHaveAccessibleDescription(
    "Whole pounds are fine Enter a balance of £0 or more",
  );
};

export const ErrorLight: Story = {
  render: () => <WithError />,
  globals: { theme: "light" },
  play: errorPlay,
};

export const ErrorDark: Story = {
  render: () => <WithError />,
  globals: { theme: "dark" },
  play: errorPlay,
};

const Currency = () => {
  const [value, setValue] = useState<number | null>(null);
  return (
    <FormField
      hint={value === null ? "Not set" : `Parsed value: ${value}`}
      label="Monthly overpayment"
    >
      {(field) => <CurrencyInput {...controlProps(field)} onValueChange={setValue} value={value} />}
    </FormField>
  );
};

export const CurrencyParsing: Story = {
  render: () => <Currency />,
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Monthly overpayment");
    await userEvent.type(input, "1,234.5");
    await expect(canvas.getByText("Parsed value: 1234.5")).toBeInTheDocument();
    await userEvent.clear(input);
    await expect(canvas.getByText("Not set")).toBeInTheDocument();
    await userEvent.type(input, "abc");
    await expect(input).toHaveValue("");
  },
};

export const Sizes: Story = {
  render: () => (
    <div>
      <FormField label="Small">
        {(field) => <TextInput {...controlProps(field)} size="sm" />}
      </FormField>
      <FormField label="Rate">
        {(field) => <TextInput {...controlProps(field)} inputMode="decimal" suffix="%" />}
      </FormField>
    </div>
  ),
  globals: { theme: "dark" },
};
