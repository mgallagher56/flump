import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { SpacingAndRadii } from "./SpacingAndRadii";

const meta: Meta<typeof SpacingAndRadii> = {
  title: "1. Foundations/Spacing, Radii & Elevation",
  component: SpacingAndRadii,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SpacingAndRadii>;

const radiusOf = (el: HTMLElement) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius);

/** Compact radii are tighter than comfortable ones in the same theme. */
const playRadii: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByTestId("density-compact")[0]).toBeInTheDocument();
  for (const alias of ["control", "card", "tray"]) {
    const comfortable = radiusOf(canvas.getByTestId(`radius-${alias}-comfortable`));
    const compact = radiusOf(canvas.getByTestId(`radius-${alias}-compact`));
    await expect(compact).toBeLessThan(comfortable);
  }
};

export const Dark: Story = {
  globals: { theme: "dark" },
  play: playRadii,
};

export const Default: Story = {
  play: async (ctx) => {
    const canvas = within(ctx.canvasElement);
    await expect(canvas.getByText("Spacing, Border Radii & Elevation")).toBeInTheDocument();
    await playRadii?.(ctx);
  },
};
