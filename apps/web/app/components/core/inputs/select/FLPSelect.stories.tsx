import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import FLPSelect from "./FLPSelect";

const meta: Meta<typeof FLPSelect> = {
  title: "Core/Inputs/FLPSelect",
  component: FLPSelect,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPSelect>;

const sampleCollection = {
  items: [
    { id: "current", name: "Current" },
    { id: "savings", name: "Savings" },
    { id: "mortgage", name: "Mortgage" },
  ],
};

const InteractiveSelect = (args: any) => {
  const [value, setValue] = useState(args.value || ["current"]);
  return (
    <FLPSelect
      {...args}
      value={value}
      onValueChange={(e) => {
        args.onValueChange?.(e);
        setValue(e.value);
      }}
    />
  );
};

export const Default: Story = {
  render: (args) => <InteractiveSelect {...args} />,
  args: {
    label: "Account Type",
    collection: sampleCollection,
    value: ["current"],
  },
};

export const RowLayout: Story = {
  render: (args) => <InteractiveSelect {...args} />,
  args: {
    label: "Account Type",
    flexDirection: "row",
    collection: sampleCollection,
    value: ["savings"],
  },
};

export const WithError: Story = {
  render: (args) => <InteractiveSelect {...args} />,
  args: {
    label: "Account Type",
    collection: sampleCollection,
    value: [""],
    error: "Choose an account type.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByLabelText("Account Type");
    await expect(select).toHaveAttribute("aria-invalid", "true");
    const errorId = select.getAttribute("aria-describedby") ?? "";
    await expect(canvasElement.querySelector(`[id="${errorId}"]`)).toHaveTextContent(
      "Choose an account type.",
    );
    await userEvent.tab();
    await expect(select).toHaveFocus();
  },
};
