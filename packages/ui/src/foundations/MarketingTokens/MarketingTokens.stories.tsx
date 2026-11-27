import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { MarketingTokens } from "./MarketingTokens";

const meta: Meta<typeof MarketingTokens> = {
  title: "1. Foundations/Marketing orb, material and motion",
  component: MarketingTokens,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof MarketingTokens>;

const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", { name: "Marketing orb, material and motion" }),
  ).toBeInTheDocument();
  const style = (id: string) => getComputedStyle(canvas.getByTestId(id));
  // Both materials resolve to a real fill and carry their shadow in this theme.
  for (const id of ["marketing-sample-glass", "marketing-sample-paper"]) {
    // A transparent computed colour ends in an alpha of 0.
    await expect(style(id).backgroundColor).not.toMatch(/,\s*0\)$/);
    await expect(style(id).boxShadow).not.toBe("none");
  }
};

export const Default: Story = { globals: { theme: "light" }, play };

export const Dark: Story = { globals: { theme: "dark" }, play };
