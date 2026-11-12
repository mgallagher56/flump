import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { DataVizPalette } from "./DataVizPalette";

const meta: Meta<typeof DataVizPalette> = {
  title: "1. Foundations/Data visualisation palette",
  component: DataVizPalette,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof DataVizPalette>;

export const Default: Story = {
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const legend = canvas.getByRole("list", { name: "Legend" });
    await expect(legend).toBeInTheDocument();
    await expect(within(legend).getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
    await expect(canvas.getByTestId("swatch-series8")).toBeInTheDocument();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
