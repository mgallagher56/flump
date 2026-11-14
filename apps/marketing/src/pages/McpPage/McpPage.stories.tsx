import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { expect, within } from "storybook/test";
import { McpPage } from "./McpPage";

const meta: Meta<typeof McpPage> = {
  title: "Marketing/McpPage",
  component: McpPage,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <Story />
      </HelmetProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof McpPage>;

const assertMcpPage: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await expect(
    canvas.getByText(/Ask your AI assistant about your own saved finances/i),
  ).toBeInTheDocument();

  await expect(canvas.getByTestId("mcp-preview-badge")).toBeInTheDocument();
  await expect(canvas.getByTestId("setup-panel-local")).toBeInTheDocument();
  await expect(canvas.queryByTestId("setup-tab-remote")).not.toBeInTheDocument();

  // Current tools only (E17 re-plan): read tools lead, the tax tool is get_tax_year_position.
  await expect(canvas.getByTestId("mcp-tool-get_financial_snapshot")).toBeInTheDocument();
  await expect(canvas.getByTestId("mcp-tool-get_tax_year_position")).toBeInTheDocument();
  await expect(canvas.queryByTestId("mcp-tool-evaluate_uk_student_loan")).not.toBeInTheDocument();
  await expect(canvas.getByText("Try the MCP preview")).toBeInTheDocument();
};

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } },
  play: assertMcpPage,
};

export const Light: Story = { globals: { theme: "light" }, play: assertMcpPage };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: {
    // E8 waiver: color-contrast
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    backgrounds: { default: "dark" },
  },
  play: assertMcpPage,
};
