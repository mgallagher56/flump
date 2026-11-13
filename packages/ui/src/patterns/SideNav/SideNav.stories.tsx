import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { SideNav } from "./SideNav";

const meta: Meta<typeof SideNav> = {
  title: "3. Financial Patterns & Sections/SideNav",
  component: SideNav,
  parameters: { layout: "fullscreen" },
  args: { items: sampleNavItems, activeKey: "home" },
};

export default meta;
type Story = StoryObj<typeof SideNav>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(canvas.getByText("Plan")).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
