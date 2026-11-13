import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { TopBar } from "./TopBar";

const meta: Meta<typeof TopBar> = {
  title: "3. Financial Patterns & Sections/TopBar",
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
