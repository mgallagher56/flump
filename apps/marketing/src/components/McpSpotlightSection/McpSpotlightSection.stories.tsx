import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { McpSpotlightSection } from "./McpSpotlightSection";

const meta: Meta<typeof McpSpotlightSection> = {
  title: "Marketing/McpSpotlightSection",
  component: McpSpotlightSection,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof McpSpotlightSection>;

const assertSpotlight: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await expect(
    canvas.getByText(/Ask Claude or Cursor about your own saved finances/i),
  ).toBeInTheDocument();

  await expect(canvas.getByText("get_tax_year_position")).toBeInTheDocument();

  const exploreLink = canvas.getByRole("link", {
    name: /About the AI connection/i,
  });
  await expect(exploreLink).toHaveAttribute("href", "/mcp");
  await expect(canvas.getByText("Example output")).toBeInTheDocument();
};

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
  play: assertSpotlight,
};

export const Light: Story = { globals: { theme: "light" }, play: assertSpotlight };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: {
    // E8 waiver: color-contrast
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    backgrounds: { default: "dark" },
  },
  play: assertSpotlight,
};
