import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { controlProps, FormField } from "../FormField/FormField";
import { WholeNumberInput } from "./WholeNumberInput";

const meta: Meta<typeof WholeNumberInput> = {
  title: "2. Primitives/WholeNumberInput",
  component: WholeNumberInput,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof WholeNumberInput>;

const Age = ({ error }: { error?: string }) => {
  const [value, setValue] = useState<number | null>(0);
  return (
    <FormField error={error} label="Retirement age">
      {(field) => (
        <WholeNumberInput
          {...controlProps(field)}
          max={100}
          min={50}
          onValueChange={setValue}
          value={value}
        />
      )}
    </FormField>
  );
};

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText("Retirement age");
  await userEvent.type(input, "67");
  await expect(input).toHaveValue("67");
  await userEvent.clear(input);
  // A digit that would go above the maximum (100) is not taken.
  await userEvent.type(input, "140");
  await expect(input).toHaveValue("14");
};

export const Light: Story = { render: () => <Age />, globals: { theme: "light" }, play };

export const Dark: Story = { render: () => <Age />, globals: { theme: "dark" }, play };

export const WithError: Story = {
  render: () => <Age error="Enter an age between 50 and 100" />,
  globals: { theme: "light" },
};

export const Disabled: Story = {
  args: { "aria-label": "Retirement age", value: 67, disabled: true },
  globals: { theme: "dark" },
};
