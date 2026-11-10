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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByText(/Connect Claude & Cursor directly to your UK finances/i),
    ).toBeInTheDocument();

    await expect(canvas.getByText(/simulate_uk_tax_and_pension_sacrifice/i)).toBeInTheDocument();

    const exploreLink = canvas.getByRole("link", {
      name: /Explore MCP & setup guides/i,
    });
    await expect(exploreLink).toHaveAttribute("href", "/mcp");
  },
};
