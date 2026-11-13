import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { controlProps, FormField } from "../FormField/FormField";
import { Select, type SelectProps } from "./Select";

const meta: Meta<typeof Select> = {
  title: "2. Primitives/Select",
  component: Select,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Select>;

const cycles = [
  { value: "monthly", label: "Monthly" },
  { value: "four-weekly", label: "Every four weeks" },
  { value: "weekly", label: "Weekly" },
];

const Field = ({
  error,
  hint,
  ...selectProps
}: Partial<SelectProps> & { error?: string; hint?: string }) => (
  <div style={{ maxWidth: 360 }}>
    <FormField error={error} hint={hint} label="How often are you paid?" required>
      {(field) => (
        <Select
          {...controlProps(field)}
          options={cycles}
          placeholder="Choose one"
          {...selectProps}
        />
      )}
    </FormField>
  </div>
);

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const select = canvas.getByLabelText(/How often are you paid/);
  await userEvent.tab();
  await expect(select).toHaveFocus();
  await userEvent.selectOptions(select, "weekly");
  await expect(select).toHaveValue("weekly");
  await expect(select).toHaveAccessibleDescription("This sets your budget cycle");
};

export const Light: Story = {
  render: () => <Field hint="This sets your budget cycle" />,
  globals: { theme: "light" },
  play,
};

export const Dark: Story = {
  render: () => <Field hint="This sets your budget cycle" />,
  globals: { theme: "dark" },
  play,
};

export const Small: Story = {
  render: () => <Field hint="This sets your budget cycle" size="sm" />,
  globals: { theme: "light" },
};

export const Disabled: Story = {
  render: () => <Field defaultValue="monthly" disabled />,
  globals: { theme: "dark" },
};

export const ErrorState: Story = {
  render: () => <Field error="Choose how often you are paid" />,
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByLabelText(/How often are you paid/);
    await expect(select).toBeInvalid();
  },
};

export const ErrorDark: Story = {
  render: () => <Field error="Choose how often you are paid" />,
  globals: { theme: "dark" },
};

export const LongContent: Story = {
  render: () => (
    <div style={{ maxWidth: 280 }}>
      <FormField label="Account to overpay from">
        {(field) => (
          <Select
            {...controlProps(field)}
            defaultValue="long"
            options={[
              {
                value: "long",
                label:
                  "Santander Everyday Current Account (joint with Alex), ending 4821, £12,480.55",
              },
              { value: "short", label: "Monzo, £1,204.10" },
            ]}
          />
        )}
      </FormField>
    </div>
  ),
  globals: { theme: "light" },
};
