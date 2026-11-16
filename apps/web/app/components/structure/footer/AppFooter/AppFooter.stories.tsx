import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { AppFooter } from "./AppFooter";

const meta: Meta<typeof AppFooter> = {
  title: "3. Patterns/Structure/AppFooter",
  component: AppFooter,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AppFooter>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 2, name: "Flump" })).toBeInTheDocument();
  await expect(canvas.getByRole("navigation", { name: "Account" })).toBeInTheDocument();
  await expect(canvas.getByRole("navigation", { name: "Resources" })).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Settings" })).toHaveAttribute(
    "href",
    "/app/profile",
  );
  await expect(canvas.getByRole("link", { name: "Security" })).toHaveAttribute(
    "href",
    "/app/profile?tab=security",
  );
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
