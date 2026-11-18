import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
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

/** Keyboard: focus starts on the selected day, arrows move by day and week, PageDown by month. */
export const Keyboard: Story = {
  render: () => <DatePickerDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Contract end date/ }));
    const body = within(document.body);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        body.getByRole("button", { name: "16 Nov 2026, selected" }),
      ),
    );
    await userEvent.keyboard("{ArrowRight}");
    await expect(document.activeElement).toBe(body.getByRole("button", { name: "17 Nov 2026" }));
    await userEvent.keyboard("{ArrowDown}");
    await expect(document.activeElement).toBe(body.getByRole("button", { name: "24 Nov 2026" }));
    await userEvent.keyboard("{PageDown}");
    await expect(document.activeElement).toBe(body.getByRole("button", { name: "24 Dec 2026" }));
    await expect(body.getByRole("table")).toHaveAccessibleName("December 2026");
    await userEvent.keyboard("{Enter}");
    await expect(
      canvas.getByRole("button", { name: "Contract end date 24 Dec 2026" }),
    ).toBeInTheDocument();
  },
};

export const KeyboardDark: Story = {
  ...Keyboard,
  globals: { theme: "dark" },
};

export const Empty: Story = {
  render: () => <DatePickerDemo initialValue="" />,
};

export const EmptyDark: Story = {
  ...Empty,
  globals: { theme: "dark" },
};
