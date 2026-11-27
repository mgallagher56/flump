import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { HomeRoughFigures } from "./HomeRoughFigures";

const meta: Meta<typeof HomeRoughFigures> = {
  title: "3. Patterns/Marketing/HomeRoughFigures",
  component: HomeRoughFigures,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof HomeRoughFigures>;

const assertSteps: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  await expect(canvas.getByText("Check in once a month")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertSteps };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertSteps,
};
