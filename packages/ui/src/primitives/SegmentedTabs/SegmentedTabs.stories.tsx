import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { SegmentedTabs } from "./SegmentedTabs";

const meta: Meta<typeof SegmentedTabs> = {
  title: "2. Primitives/SegmentedTabs",
  component: SegmentedTabs,
  parameters: {
    layout: "centered",
  },
  args: {
    items: [
      { value: "avalanche", label: "Avalanche (Highest APR)" },
      { value: "snowball", label: "Snowball (Lowest Balance)" },
      { value: "minimum", label: "Minimum Only" },
    ],
    value: "avalanche",
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SegmentedTabs>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const avalancheTab = canvas.getByRole("tab", { name: "Avalanche (Highest APR)" });
    const snowballTab = canvas.getByRole("tab", { name: "Snowball (Lowest Balance)" });

    await expect(avalancheTab).toHaveAttribute("aria-selected", "true");
    await expect(snowballTab).toHaveAttribute("aria-selected", "false");

    // Click tab
    await userEvent.click(snowballTab);
    await expect(args.onValueChange).toHaveBeenCalledWith("snowball");
  },
};

const PageTabs = () => {
  const [value, setValue] = useState("overview");
  return (
    <SegmentedTabs
      aria-label="Account sections"
      value={value}
      onValueChange={setValue}
      items={[
        { value: "overview", label: "Overview" },
        { value: "activity", label: "Activity" },
        { value: "settings", label: "Settings" },
      ]}
      panels={{
        overview: <p>Your balances and upcoming payments are summarised here.</p>,
        activity: <p>Recent transactions appear here once your bank has synced.</p>,
        settings: <p>Choose how often Flump checks your accounts.</p>,
      }}
    />
  );
};

/** Page tabs with real panels: aria-controls resolves, so axe reports no dangling references. */
export const WithPanels: Story = {
  render: () => <PageTabs />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const overview = canvas.getByRole("tab", { name: "Overview" });
    const panelId = overview.getAttribute("aria-controls");
    await expect(panelId).toBeTruthy();
    await expect(canvas.getByRole("tabpanel", { name: "Overview" })).toHaveAttribute(
      "id",
      panelId ?? "",
    );
    await userEvent.click(canvas.getByRole("tab", { name: "Activity" }));
    await expect(canvas.getByRole("tabpanel", { name: "Activity" })).toBeInTheDocument();
    overview.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("tab", { name: "Activity" })).toHaveFocus();
  },
};

/** Composed with `SegmentedTabs.Panel` children instead of the `panels` prop. */
export const WithPanelChildren: Story = {
  render: () => (
    <SegmentedTabs
      aria-label="Report"
      value="a"
      onValueChange={() => undefined}
      items={[
        { value: "a", label: "Summary" },
        { value: "b", label: "Detail" },
      ]}
    >
      <SegmentedTabs.Panel value="a">Summary content</SegmentedTabs.Panel>
      <SegmentedTabs.Panel value="b">Detail content</SegmentedTabs.Panel>
    </SegmentedTabs>
  ),
};

/** Manual activation: arrows move focus, Enter selects. For tabs where switching has a cost. */
export const ManualActivation: Story = {
  args: { activationMode: "manual", "aria-label": "Manual activation" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("tab", { name: "Avalanche (Highest APR)" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("tab", { name: "Snowball (Lowest Balance)" })).toHaveFocus();
    await expect(args.onValueChange).not.toHaveBeenCalled();
  },
};
