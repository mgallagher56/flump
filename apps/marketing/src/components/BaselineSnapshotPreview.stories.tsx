import type { Meta, StoryObj } from "@storybook/react";
import { BaselineSnapshotPreview } from "./BaselineSnapshotPreview";

const meta: Meta<typeof BaselineSnapshotPreview> = {
  title: "Marketing/BaselineSnapshotPreview",
  component: BaselineSnapshotPreview,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof BaselineSnapshotPreview>;

export const Default: Story = {
  // E8 waiver: color-contrast
  parameters: { a11y: { test: "todo" } },
};
