import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { HomeFeatures } from "./HomeFeatures";

const meta: Meta<typeof HomeFeatures> = {
  title: "3. Patterns/Marketing/HomeFeatures",
  component: HomeFeatures,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomeFeatures>;

const assertTiles: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const list = canvas.getByRole("list", { name: "Flump features" });
  await expect(within(list).getAllByRole("listitem")).toHaveLength(6);
  await expect(canvas.getByRole("link", { name: "All Flump features on one page" })).toBeVisible();
  // Dots only, never a count such as "4 to 5 of 6" (MK9).
  await expect(canvasElement.textContent ?? "").not.toMatch(/\d+ (to|of) \d+/);
};

export const Light: Story = { globals: { theme: "light" }, play: assertTiles };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertTiles,
};

/** A phone: the row scrolls sideways, with previous, the dots and next under it. */
export const Phone: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile2" } },
  play: assertTiles,
};
