import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, within } from "storybook/test";
import { ToolPage } from "./ToolPage";

const meta: Meta<typeof ToolPage> = {
  title: "6. Pages/Marketing/ToolPage",
  component: ToolPage,
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter initialEntries={["/tools/mortgage-overpayment-vs-isa-calculator"]}>
          <Routes>
            <Route path="/tools/:slug" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof ToolPage>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", {
      level: 1,
      name: "Mortgage overpayment or Stocks and Shares ISA",
    }),
  ).toBeInTheDocument();
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
