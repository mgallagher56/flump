import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { SiteFooter } from "./SiteFooter";

const meta: Meta<typeof SiteFooter> = {
  title: "3. Patterns/SiteFooter",
  component: SiteFooter,
  parameters: { layout: "fullscreen" },
  args: {
    blurb: "UK budget, debt and tax calculators. Estimates for guidance, not advice.",
    columns: [
      {
        heading: "Free calculators",
        links: [
          { key: "snowball", label: "Snowball vs avalanche", href: "#snowball" },
          { key: "all", label: "All calculators", href: "#tools" },
        ],
      },
      {
        heading: "Account and support",
        links: [
          { key: "signup", label: "Sign up", href: "#signup" },
          { key: "signin", label: "Sign in", href: "#login" },
        ],
      },
    ],
    bottom: "© 2026 Flump",
  },
};

export default meta;
type Story = StoryObj<typeof SiteFooter>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("navigation", { name: "Free calculators" })).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "#login");
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
