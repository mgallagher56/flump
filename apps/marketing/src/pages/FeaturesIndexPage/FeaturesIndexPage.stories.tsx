import type { Meta, StoryObj } from "@storybook/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, within } from "storybook/test";
import { StillMotionProvider } from "../../context/StillMotionContext";
import { FeaturesIndexPage } from "./FeaturesIndexPage";

const meta: Meta<typeof FeaturesIndexPage> = {
  title: "6. Pages/Marketing/FeaturesIndexPage",
  component: FeaturesIndexPage,
  decorators: [
    // The rest state, as with reduced motion: axe checks what a reader sees once a moment ends.
    (Story) => (
      <StillMotionProvider>
        <Story />
      </StillMotionProvider>
    ),
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
  await expect(
    canvas.getByRole("heading", { level: 1, name: "Everything Flump does" }),
  ).toBeVisible();
  await expect(canvas.getByRole("navigation", { name: "Start here" })).toBeVisible();
  await expect(
    canvas.getByRole("heading", { level: 3, name: "Settings and your data" }),
  ).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPage };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPage,
};
