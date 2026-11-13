import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { controlProps, FormField } from "../FormField/FormField";
import { PercentInput } from "./PercentInput";

const meta: Meta<typeof PercentInput> = {
  title: "2. Primitives/PercentInput",
  component: PercentInput,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof PercentInput>;

const Rate = ({ error }: { error?: string }) => {
  const [value, setValue] = useState<number | null>(null);
  return (
    <FormField error={error} hint="Check your latest mortgage statement" label="Interest rate">
      {(field) => (
        <PercentInput
          {...controlProps(field)}
          max={100}
          min={0}
          onValueChange={setValue}
          value={value}
        />
      )}
    </FormField>
  );
};

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText("Interest rate");
  await userEvent.type(input, "4.5");
  await userEvent.tab();
  await expect(input).toHaveValue("4.5");
  await userEvent.clear(input);
  await userEvent.type(input, "250");
  await userEvent.tab();
  await expect(input).toHaveValue("100");
};

export const Light: Story = { render: () => <Rate />, globals: { theme: "light" }, play };

export const Dark: Story = { render: () => <Rate />, globals: { theme: "dark" }, play };

export const WithError: Story = {
  render: () => <Rate error="Enter a rate between 0% and 100%" />,
  globals: { theme: "light" },
};

export const Disabled: Story = {
  args: { "aria-label": "Interest rate", value: 4.5, disabled: true },
  globals: { theme: "dark" },
};

export const Small: Story = {
  args: { "aria-label": "Interest rate", value: 1234.5, size: "sm" },
  globals: { theme: "light" },
};
