import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { MotionToggle } from "./MotionToggle";

const meta: Meta<typeof MotionToggle> = {
  title: "3. Patterns/Marketing/MotionToggle",
  component: MotionToggle,
};

export default meta;
type Story = StoryObj<typeof MotionToggle>;

/** Off, then on by keyboard, then off again; the page is left as it was. */
const play: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const button = canvas.getByRole("button", { name: "Reduce motion" });
  const root = canvasElement.ownerDocument.documentElement;
  const before = root.getAttribute("data-motion");
  try {
    await expect(button).toHaveAttribute("aria-pressed", "false");
    button.focus();
    await userEvent.keyboard("{Enter}");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(root).toHaveAttribute("data-motion", "reduce");
    await userEvent.keyboard("{Enter}");
    await expect(button).toHaveAttribute("aria-pressed", "false");
  } finally {
    if (before === null) root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", before);
    try {
      localStorage.removeItem("flump-motion");
    } catch {
      // Storage blocked: nothing was stored.
    }
  }
};

export const Light: Story = { globals: { theme: "light" }, play };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play,
};
