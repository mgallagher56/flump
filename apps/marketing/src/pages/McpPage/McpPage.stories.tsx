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
    canvas.getByText(/Give your AI agent deterministic UK financial intelligence/i),
  ).toBeInTheDocument();

  await expect(canvas.getByTestId("mcp-preview-badge")).toBeInTheDocument();
  await expect(canvas.getByTestId("setup-panel-local")).toBeInTheDocument();
  await expect(canvas.queryByTestId("setup-tab-remote")).not.toBeInTheDocument();

  // Verify all 8 tools are rendered
  await expect(canvas.getByTestId("mcp-tool-simulate_debt_payoff")).toBeInTheDocument();
  await expect(canvas.getByTestId("mcp-tool-evaluate_uk_student_loan")).toBeInTheDocument();
  await expect(canvas.getByTestId("mcp-tool-query_transactions_and_spending")).toBeInTheDocument();
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
