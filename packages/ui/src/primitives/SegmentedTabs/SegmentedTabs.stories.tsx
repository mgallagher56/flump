import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
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
