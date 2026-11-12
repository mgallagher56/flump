import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { controlProps, FormField } from "../FormField/FormField";
import { CurrencyInput } from "./CurrencyInput";

const onValueChange = fn();

const meta: Meta<typeof CurrencyInput> = {
  title: "2. Primitives/CurrencyInput",
  component: CurrencyInput,
  parameters: { layout: "padded" },
  args: { "aria-label": "Savings balance", onValueChange },
};

export default meta;
type Story = StoryObj<typeof CurrencyInput>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText("Savings balance");
  await userEvent.type(input, "1,234.567");
  await expect(onValueChange).toHaveBeenLastCalledWith(1234.567);
  // Blur rounds to whole pence so the display and the model agree.
  await userEvent.tab();
  await expect(input).toHaveValue("1,234.57");
  await expect(onValueChange).toHaveBeenLastCalledWith(1234.57);
  await userEvent.clear(input);
  await expect(onValueChange).toHaveBeenLastCalledWith(null);
  await userEvent.type(input, "abc");
  await expect(input).toHaveValue("");
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

// The parent keeps null as null (never `?? 0`) and turns onInvalid into a FormField error.
const WithInvalidError = () => {
  const [value, setValue] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();
  return (
    <FormField
      error={error}
      hint="Enter pounds and pence, for example 1,234.50"
      label="Overpayment"
    >
      {(field) => (
        <CurrencyInput
          {...controlProps(field)}
          onInvalid={() => setError("Enter a valid amount, for example 1,234.50")}
          onValueChange={(next) => {
            setValue(next);
            if (next !== null) setError(undefined);
          }}
          value={value}
        />
      )}
    </FormField>
  );
};

const invalidPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText("Overpayment");
  await userEvent.type(input, "1.2.3");
  await expect(canvas.getByRole("alert")).toHaveTextContent("Enter a valid amount");
  await expect(input).toBeInvalid();
  await userEvent.clear(input);
  await userEvent.type(input, "50");
  await expect(canvas.queryByRole("alert")).toBeNull();
};

export const InvalidLight: Story = {
  render: () => <WithInvalidError />,
  globals: { theme: "light" },
  play: invalidPlay,
};

export const InvalidDark: Story = {
  render: () => <WithInvalidError />,
  globals: { theme: "dark" },
  play: invalidPlay,
};
