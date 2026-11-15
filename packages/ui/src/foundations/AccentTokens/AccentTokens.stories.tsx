import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { AccentTokens } from "./AccentTokens";

const meta: Meta<typeof AccentTokens> = {
  title: "1. Foundations/Accent",
  component: AccentTokens,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof AccentTokens>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { name: "Accent" })).toBeInTheDocument();
  const background = (id: string) => getComputedStyle(canvas.getByTestId(id)).backgroundColor;
  // The tint resolves to a real colour and differs from a plain card in both themes.
  await expect(background("accent-sample-card")).not.toBe(background("accent-sample-plain"));
  await expect(background("accent-sample-card")).not.toBe("rgba(0, 0, 0, 0)");
};

export const Default: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
