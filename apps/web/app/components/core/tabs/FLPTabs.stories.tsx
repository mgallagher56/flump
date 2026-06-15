import type { Meta, StoryObj } from "@storybook/react";
import FLPTabs from "./FLPTabs";

const meta: Meta<typeof FLPTabs> = {
  title: "Core/Tabs/FLPTabs",
  component: FLPTabs,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPTabs>;

const sampleData = [
  {
    value: "tab1",
    label: "Overview",
    children: <div style={{ padding: "10px" }}>Overview Content</div>,
  },
  {
    value: "tab2",
    label: "Accounts",
    children: <div style={{ padding: "10px" }}>Accounts Content</div>,
  },
  {
    value: "tab3",
    label: "Settings",
    children: <div style={{ padding: "10px" }}>Settings Content</div>,
    disabled: true,
  },
];

export const Horizontal: Story = {
  args: {
    data: sampleData,
    orientation: "horizontal",
  },
};

export const Vertical: Story = {
  args: {
    data: sampleData,
    orientation: "vertical",
  },
};
