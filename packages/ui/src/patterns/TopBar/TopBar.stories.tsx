import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { TopBar } from "./TopBar";

const meta: Meta<typeof TopBar> = {
  title: "3. Patterns/TopBar",
  component: TopBar,
  parameters: { layout: "fullscreen" },
  args: {
    items: sampleNavItems,
    activeKey: "home",
    logo: <strong>Flump</strong>,
    actions: <button type="button">Account</button>,
  },
};

export default meta;
type Story = StoryObj<typeof TopBar>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  const trigger = canvas.getByRole("button", { name: "Plan" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(trigger);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await userEvent.keyboard("{Escape}");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
};

export const Light: Story = {
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "desktop" } },
  play,
};

export const Dark: Story = { globals: { theme: "dark" }, play };

export const Collapsed: Story = {
  args: { onMenuClick: () => undefined },
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/**
 * Tablet (768px to 1023px): `wideOnly` links leave the inline bar and the menu button stays
 * (`menuBelow="wide"`), as on the marketing site.
 */
export const Tablet: Story = {
  args: {
    items: [
      ...sampleNavItems.slice(0, 2),
      { key: "extra", label: "Lower priority", href: "/extra", wideOnly: true },
    ],
    menuBelow: "wide",
    onMenuClick: () => undefined,
  },
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Open menu" })).toBeInTheDocument();
  },
};

export const TabletDark: Story = { ...Tablet, globals: { theme: "dark" } };
