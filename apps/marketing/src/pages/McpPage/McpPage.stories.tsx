import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { McpPage } from "./McpPage";

const meta: Meta<typeof McpPage> = {
  title: "6. Pages/Marketing/McpPage",
  component: McpPage,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof McpPage>;

const assertMcpPage: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Ask an AI assistant about your figures" }),
  ).toBeVisible();
  await expect(canvas.queryByTestId("mcp-technical-details")).not.toBeInTheDocument();
  await userEvent.click(canvas.getByRole("button", { name: "Show technical details" }));
  await waitFor(() => expect(canvas.getByTestId("mcp-tool-get_tax_year_position")).toBeVisible());
};

export const Light: Story = { globals: { theme: "light" }, play: assertMcpPage };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertMcpPage,
};
