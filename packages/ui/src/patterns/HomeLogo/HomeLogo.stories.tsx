import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { HomeLogo } from "./HomeLogo";

const meta: Meta<typeof HomeLogo> = {
  title: "3. Financial Patterns & Sections/HomeLogo",
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
