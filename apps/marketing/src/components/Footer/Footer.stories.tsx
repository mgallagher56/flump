import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Footer } from "./Footer";

const meta: Meta<typeof Footer> = {
  title: "Marketing/Footer",
  component: Footer,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof Footer>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("navigation", { name: "Product" })).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
