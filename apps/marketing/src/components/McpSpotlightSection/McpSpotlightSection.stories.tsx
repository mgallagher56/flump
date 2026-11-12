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
    canvas.getByText(/Give Claude and Cursor deterministic UK tax and finance tools/i),
  ).toBeInTheDocument();

  await expect(canvas.getByText(/simulate_uk_tax_and_pension_sacrifice/i)).toBeInTheDocument();

  const exploreLink = canvas.getByRole("link", {
    name: /Explore MCP & setup guides/i,
  });
  await expect(exploreLink).toHaveAttribute("href", "/mcp");
  await expect(canvas.getByText("Example output")).toBeInTheDocument();
};

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
  play: assertSpotlight,
};

export const Light: Story = {
  globals: { theme: "light" },
  // E8 waiver: color-contrast (the outline Button uses text.primary on the dark surface.contrast panel;
  // the real fix is the marketing restyle, E15 phase 7. Same waiver as Default and Dark.)
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
  play: assertSpotlight,
};

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: {
    // E8 waiver: color-contrast
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    backgrounds: { default: "dark" },
  },
  play: assertSpotlight,
};
