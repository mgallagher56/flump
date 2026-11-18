import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { BaselineSnapshotPreview } from "./BaselineSnapshotPreview";

const meta: Meta<typeof BaselineSnapshotPreview> = {
  title: "3. Patterns/Marketing/BaselineSnapshotPreview",
  component: BaselineSnapshotPreview,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof BaselineSnapshotPreview>;

const assertPreview: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Example")).toBeVisible();
  await expect(canvas.getByText("Breathing room")).toBeVisible();
  await expect(canvas.getByText(/^About \d+(\.\d)? months?$/)).toBeVisible();
  await expect(canvas.getByText("How long your savings would cover the essentials.")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPreview };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPreview,
};
