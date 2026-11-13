import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { AppShell } from "./AppShell";

const meta: Meta<typeof AppShell> = {
  title: "3. Financial Patterns & Sections/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  args: {
    items: sampleNavItems,
    activeKey: "home",
    logo: <strong>Flump</strong>,
    actions: <button type="button">Account</button>,
    showSideNav: true,
    children: <h1>Home</h1>,
  },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("main")).toHaveAttribute("id", "main-content");
  await expect(canvas.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
    "href",
    "#main-content",
  );
  await userEvent.tab();
  await expect(canvas.getByRole("link", { name: "Skip to main content" })).toHaveFocus();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
