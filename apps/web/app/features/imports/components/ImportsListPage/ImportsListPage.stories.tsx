import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { BATCH_LIST } from "../../fixtures";
import { ImportsListPage } from "./ImportsListPage";

const meta: Meta<typeof ImportsListPage> = {
  title: "6. Pages/Imports/ImportsListPage",
  component: ImportsListPage,
  parameters: { layout: "fullscreen" },
  args: { batches: BATCH_LIST },
};

export default meta;
type Story = StoryObj<typeof ImportsListPage>;

export const WithImports: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Ready to review")[0]).toBeDefined();
  },
};

export const Empty: Story = {
  args: { batches: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No imports yet")).toBeDefined();
  },
};
