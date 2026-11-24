import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { ClosingCta } from "./ClosingCta";

const meta: Meta<typeof ClosingCta> = {
  title: "3. Patterns/Marketing/ClosingCta",
  component: ClosingCta,
  parameters: { layout: "fullscreen" },
  args: {
    id: "get-started",
    titleId: "closing-title",
    title: "Ready to see where you stand?",
    text: "Start with a few rough numbers.",
    cta: { href: "#", label: "Request an invite" },
  },
};

export default meta;
type Story = StoryObj<typeof ClosingCta>;

const assertCta: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(canvas.getByRole("link", { name: "Request an invite" })).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertCta };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertCta,
};
