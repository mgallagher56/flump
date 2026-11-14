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
  title: "3. Patterns/Signed-out/SandboxBar",
  component: SandboxBar,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SandboxBar>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
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
    const tab = canvas.getAllByRole("tab", { name: "Paying off debts" })[0];
    if (!tab) throw new Error("Tab missing");
    await userEvent.click(tab);
    await expect(tab).toHaveAttribute("aria-selected", "true");
  },
};
