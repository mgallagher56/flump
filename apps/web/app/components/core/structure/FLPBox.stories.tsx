import type { Meta, StoryObj } from "@storybook/react";
import FLPBox from "./FLPBox";

const meta: Meta<typeof FLPBox> = {
  title: "Core/Structure/FLPBox",
  component: FLPBox,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FLPBox>;

export const Default: Story = {
  args: {
    display: "flex",
    flexDirection: "row",
    gap: "16px",
    children: (
      <>
        <div style={{ padding: "20px", background: "#333", borderRadius: "4px" }}>Item 1</div>
        <div style={{ padding: "20px", background: "#444", borderRadius: "4px" }}>Item 2</div>
        <div style={{ padding: "20px", background: "#555", borderRadius: "4px" }}>Item 3</div>
      </>
    ),
  },
};

export const Column: Story = {
  args: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    children: (
      <>
        <div style={{ padding: "10px", background: "#333" }}>Row 1</div>
        <div style={{ padding: "10px", background: "#444" }}>Row 2</div>
      </>
    ),
  },
};
