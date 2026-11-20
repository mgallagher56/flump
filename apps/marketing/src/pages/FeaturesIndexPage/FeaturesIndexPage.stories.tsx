import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { FeaturesIndexPage } from "./FeaturesIndexPage";

const meta: Meta<typeof FeaturesIndexPage> = {
  title: "6. Pages/Marketing/FeaturesIndexPage",
  component: FeaturesIndexPage,
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
type Story = StoryObj<typeof FeaturesIndexPage>;

const assertPage: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Flump features" })).toBeVisible();
  const list = canvas.getByRole("list", { name: "Flump features" });
  await expect(within(list).getAllByRole("link")).toHaveLength(6);
};

export const Light: Story = { globals: { theme: "light" }, play: assertPage };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPage,
};
