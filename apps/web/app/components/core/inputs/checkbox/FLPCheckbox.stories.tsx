import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import FLPCheckbox from "./FLPCheckbox";

const meta: Meta<typeof FLPCheckbox> = {
  title: "Core/Inputs/FLPCheckbox",
  component: FLPCheckbox,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPCheckbox>;

export const Default: Story = {
  args: {
    label: "Subscribe to monthly updates",
  },
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
    label: "Real terms (-2.5% inflation)",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Salary Sacrifice",
    description: "Saves National Insurance contributions on pre-tax pension deposits",
  },
};

export const WithError: Story = {
  args: {
    label: "I agree to the terms and privacy policy",
    error: "You must accept the terms before proceeding",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox", { name: /I agree to the terms/ });
    await expect(checkbox).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("alert")).toHaveTextContent("You must accept the terms");
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: "Option currently unavailable",
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <FLPCheckbox label="Small Checkbox (toolbar/inline)" size="sm" />
      <FLPCheckbox defaultChecked label="Medium Checkbox (default)" size="md" />
      <FLPCheckbox label="Large Checkbox (spacious/touch)" size="lg" />
    </div>
  ),
};
