import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { JointSummaryList } from "./JointSummaryList";

const meta: Meta<typeof JointSummaryList> = {
  title: "3. Patterns/Household/JointSummaryList",
  component: JointSummaryList,
  parameters: { layout: "padded" },
  args: {
    otherName: "Sam",
    items: [
      { name: "Bills account", type: "Current", wholeBalance: 1234.5, addedBy: "you" },
      { name: "Bills account", type: "Current", wholeBalance: 1234.5, addedBy: "other" },
      { name: "Holiday pot", type: "Saving", wholeBalance: 860, addedBy: "other" },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof JointSummaryList>;

export const WithItems: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(canvas.getByText(/appears twice/)).toBeInTheDocument();
  },
};

export const WithItemsDark: Story = { globals: { theme: "dark" } };

export const NothingShown: Story = { args: { items: [] } };

export const NothingShownDark: Story = { args: { items: [] }, globals: { theme: "dark" } };

export const CouldNotLoad: Story = { args: { items: null } };

export const CouldNotLoadDark: Story = { ...CouldNotLoad, globals: { theme: "dark" } };
