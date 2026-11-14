import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { BaselineSnapshotPreview } from "./BaselineSnapshotPreview";

const meta: Meta<typeof BaselineSnapshotPreview> = {
  title: "Marketing/BaselineSnapshotPreview",
  component: BaselineSnapshotPreview,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof BaselineSnapshotPreview>;

const assertPreview: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Example")).toBeVisible();
  await expect(canvas.getByText("Months of cover")).toBeVisible();
};

export const Light: Story = { globals: { theme: "light" }, play: assertPreview };

export const Dark: Story = {
  globals: { theme: "dark" },
  parameters: { backgrounds: { default: "dark" } },
  play: assertPreview,
};
