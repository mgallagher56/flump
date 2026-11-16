import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { controlProps, FormField } from "../FormField";
import { DatePicker } from "./DatePicker";

const meta: Meta<typeof DatePicker> = {
  title: "Primitives/DatePicker",
  component: DatePicker,
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

function DatePickerDemo({ initialValue = "2026-11-16" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <div style={{ width: "280px" }}>
      <FormField label="Contract end date">
        {(field) => <DatePicker {...controlProps(field)} onValueChange={setValue} value={value} />}
      </FormField>
    </div>
  );
}

export const Default: Story = {
  render: () => <DatePickerDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Contract end date/ }));
    const body = within(document.body);
    await expect(body.getByTestId("datepicker-days")).toBeDefined();
    await userEvent.click(body.getByRole("button", { name: /^Choose month/ }));
    await userEvent.click(body.getByRole("button", { name: "Back to calendar" }));
    await expect(body.getByTestId("datepicker-days")).toBeDefined();
  },
};

export const DefaultDark: Story = {
  ...Default,
  globals: { theme: "dark" },
};

export const Empty: Story = {
  render: () => <DatePickerDemo initialValue="" />,
};

export const EmptyDark: Story = {
  ...Empty,
  globals: { theme: "dark" },
};
