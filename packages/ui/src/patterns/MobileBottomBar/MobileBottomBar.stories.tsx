import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { MobileBottomBar } from "./MobileBottomBar";

const meta: Meta<typeof MobileBottomBar> = {
  title: "3. Patterns/MobileBottomBar",
  component: MobileBottomBar,
  parameters: { layout: "fullscreen" },
  args: { items: sampleNavItems, activeKey: "home" },
};

export default meta;
type Story = StoryObj<typeof MobileBottomBar>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("navigation", { name: "Primary mobile" })).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(canvas.getByRole("link", { name: "Borrowing" })).toBeInTheDocument();
};

export const Light: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play,
};

/** 768 to 1023px: no inline top bar items, so the bottom bar must still be present. */
export const Tablet: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play,
};
