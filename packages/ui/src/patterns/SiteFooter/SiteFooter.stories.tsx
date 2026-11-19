import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { SiteFooter } from "./SiteFooter";

const meta: Meta<typeof SiteFooter> = {
  title: "3. Patterns/SiteFooter",
  component: SiteFooter,
  parameters: { layout: "fullscreen" },
  args: {
    blurb: "UK budget, debt and tax calculators.",
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

const compactPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("link", { name: "Home" })).toBeInTheDocument();
  await expect(canvas.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
};

/** The signed-in web app's footer: one line with the logo, at every width. */
export const CompactLight: Story = {
  args: {
    variant: "compact",
    logo: <a href="#home">Home</a>,
    bottom: "© 2026 Flump Finance Ltd",
    bottomFrom: "lg",
    links: [
      { key: "settings", label: "Settings", href: "#settings" },
      { key: "security", label: "Security", href: "#security", show: "fromMd" },
      { key: "short", label: "Calculators", href: "#tools", show: "belowMd" },
      { key: "long", label: "All calculators", href: "#tools", show: "fromMd" },
    ],
  },
  globals: { theme: "light" },
  play: compactPlay,
};

export const CompactDark: Story = {
  ...CompactLight,
  globals: { theme: "dark" },
};
