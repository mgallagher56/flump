import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { PageRules } from "./PageRules";

const meta: Meta<typeof PageRules> = {
  title: "1. Foundations/Page rules",
  component: PageRules,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof PageRules>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 1, name: "Page rules" })).toBeInTheDocument();
  const list = canvas.getByRole("list", { name: "Page rules" });
  await expect(within(list).getAllByRole("listitem")).toHaveLength(13);
  await expect(canvas.getAllByText("Do")).toHaveLength(13);
  await expect(canvas.getAllByText("Don't")).toHaveLength(13);
};

export const Default: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
