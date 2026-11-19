import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Header } from "./Header";

const meta: Meta<typeof Header> = {
  title: "3. Patterns/Marketing/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Header>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Flump home" })).toBeInTheDocument();
  // One theme control shows at any width: the three-way switch from 1024px, one button below.
  await expect(
    canvasElement.querySelector("#theme-toggle, #theme-toggle-compact"),
  ).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };

/** 768px: the menu button, the one-button theme switch and the CTA, with no inline links (P72). */
export const Tablet: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /open navigation menu/i })).toBeVisible();
    await expect(canvas.queryByRole("navigation", { name: "Primary" })).toBeNull();
  },
};

export const TabletDark: Story = { ...Tablet, globals: { theme: "dark" } };
