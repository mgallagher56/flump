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

/**
 * Tablet with `linksFrom="wide"` as well: the menu button and no inline links, so the navigation
 * never shows twice (marketing, P72). From 1024px the links show and the button goes.
 */
export const TabletMenuOnly: Story = {
  args: { menuBelow: "wide", linksFrom: "wide", onMenuClick: () => undefined },
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "tablet" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const wide = window.matchMedia("(min-width: 64rem)").matches;
    const nav = canvasElement.querySelector('nav[aria-label="Primary"]') as HTMLElement;
    await expect(getComputedStyle(nav).display === "none").toBe(!wide);
    if (!wide) await expect(canvas.getByRole("button", { name: "Open menu" })).toBeVisible();
  },
};

export const TabletMenuOnlyDark: Story = { ...TabletMenuOnly, globals: { theme: "dark" } };
