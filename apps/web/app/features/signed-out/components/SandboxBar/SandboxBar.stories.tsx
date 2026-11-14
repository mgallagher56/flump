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
    // The three household tabs are visible: none collapses to zero width (R2-4 sandbox item 1).
    const bar = canvas.getAllByTestId("sandbox-bar")[0];
    if (!bar) throw new Error("Bar missing");
    const tabs = within(bar).getAllByRole("tab");
    await expect(tabs).toHaveLength(3);
    for (const each of tabs) {
      await expect(each.getBoundingClientRect().width).toBeGreaterThan(0);
      await expect(each).toBeVisible();
    }
    await userEvent.click(tab);
    await expect(tab).toHaveAttribute("aria-selected", "true");
  },
};
