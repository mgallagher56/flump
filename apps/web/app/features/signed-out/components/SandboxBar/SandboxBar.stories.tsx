import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { SandboxBar } from "./SandboxBar";

const personas = [
  { key: "medium", label: "Renting" },
  { key: "debt", label: "Paying off debts" },
  { key: "high", label: "Paying a mortgage and letting a property" },
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
    const [active, setActive] = useState<string>("medium");
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
    await userEvent.click(canvas.getByRole("button", { name: "Paying off debts" }));
    await expect(canvas.getByRole("button", { name: "Paying off debts" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};
