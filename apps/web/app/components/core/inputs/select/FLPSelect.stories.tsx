import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
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
