import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { HomeLogo } from "./HomeLogo";

const meta: Meta<typeof HomeLogo> = {
  title: "3. Patterns/HomeLogo",
  component: HomeLogo,
};

export default meta;
type Story = StoryObj<typeof HomeLogo>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Flump home" })).toHaveAttribute("href", "/");
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

export const Decorative: Story = {
  args: { decorative: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

const currentPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Flump home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
};

/** On the home page: announced as current, with the mark drawn below the wide nav width. */
export const Current: Story = {
  args: { current: true },
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play: currentPlay,
};

export const CurrentDark: Story = { ...Current, globals: { theme: "dark" } };
