import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { HomeClose } from "./HomeClose";

const meta: Meta<typeof HomeClose> = {
  title: "3. Patterns/Marketing/HomeClose",
  component: HomeClose,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof HomeClose>;

const assertClose: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { level: 2, name: "Ready to see where you stand?" }),
  ).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Request an invite" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertClose };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertClose,
};
