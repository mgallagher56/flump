import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, within } from "storybook/test";
import { ToolsIndexPage } from "./ToolsIndexPage";

const meta: Meta<typeof ToolsIndexPage> = {
  title: "Marketing/ToolsIndexPage",
  component: ToolsIndexPage,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter initialEntries={["/tools"]}>
          <Routes>
            <Route path="/tools" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof ToolsIndexPage>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "UK money calculators, free during the beta" }),
  ).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
