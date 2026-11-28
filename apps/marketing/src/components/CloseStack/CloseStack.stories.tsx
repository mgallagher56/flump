import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { CloseStack } from "./CloseStack";

const meta: Meta<typeof CloseStack> = {
  title: "3. Patterns/Marketing/CloseStack",
  component: CloseStack,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CloseStack>;

const assertStack: Story["play"] = async ({ canvasElement }) => {
  const stack = canvasElement.querySelector("[data-close-stack]");
  await expect(stack?.getAttribute("aria-hidden")).toBe("true");
  await expect(stack?.querySelectorAll("[data-close-piece]")).toHaveLength(6);
};

export const Light: Story = { globals: { theme: "light" }, play: assertStack };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertStack,
};
