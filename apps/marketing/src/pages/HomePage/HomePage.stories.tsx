import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { HomePage } from "./HomePage";

const meta: Meta<typeof HomePage> = {
  title: "6. Pages/Marketing/HomePage",
  component: HomePage,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <HelmetProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </HelmetProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomePage>;

const assertHome: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 1, name: "See where you stand each month" }),
  ).toBeVisible();
  const main = within(canvas.getByRole("main"));
  await expect(main.getAllByRole("link", { name: "Request an invite" })).toHaveLength(2);
};

export const Light: Story = { globals: { theme: "light" }, play: assertHome };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertHome,
};
