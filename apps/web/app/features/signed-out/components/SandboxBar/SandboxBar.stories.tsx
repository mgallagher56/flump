import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { SandboxBar } from "./SandboxBar";

const personas = [
  { key: "debt", label: "Clearing £8k debt" },
  { key: "medium", label: "£45k earner, no debt" },
  { key: "high", label: "£100k high earner" },
] as const;

const meta: Meta<typeof SandboxBar> = {
  title: "Signed-out/SandboxBar",
  component: SandboxBar,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SandboxBar>;

export const Default: Story = {
  render: () => {
    const [active, setActive] = useState<string>("debt");
    return (
      <SandboxBar
        active={active}
        onSave={() => undefined}
        onSelect={setActive}
        personas={personas}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "£45k earner, no debt" }));
    await expect(canvas.getByRole("button", { name: "£45k earner, no debt" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
