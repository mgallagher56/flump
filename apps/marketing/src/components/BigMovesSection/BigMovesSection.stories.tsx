import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { BigMovesSection } from "./BigMovesSection";

const meta: Meta<typeof BigMovesSection> = {
  title: "Marketing/BigMovesSection",
  component: BigMovesSection,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof BigMovesSection>;

const assertMoves: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "Rent or mortgage" })).toBeInTheDocument();
  await expect(canvas.getByText("Renting")).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Browse free calculators" })).toHaveAttribute(
    "href",
    "/tools",
  );
};

export const Light: Story = { globals: { theme: "light" }, play: assertMoves };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertMoves,
};
