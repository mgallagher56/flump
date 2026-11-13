import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { MonthlyPictureSection } from "./MonthlyPictureSection";

const meta: Meta<typeof MonthlyPictureSection> = {
  title: "Marketing/MonthlyPictureSection",
  component: MonthlyPictureSection,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof MonthlyPictureSection>;

const assertPicture: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "Your monthly picture" })).toBeInTheDocument();
  await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
  await expect(canvas.getAllByText("Example")).toHaveLength(3);
};

export const Light: Story = { globals: { theme: "light" }, play: assertPicture };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPicture,
};
