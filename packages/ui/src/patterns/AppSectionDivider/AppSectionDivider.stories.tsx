import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { AppSectionDivider } from "./AppSectionDivider";

const meta: Meta<typeof AppSectionDivider> = {
  title: "3. Patterns/AppSectionDivider",
  component: AppSectionDivider,
  parameters: {
    layout: "padded",
  },
  args: {
    label: "Emergency Buffer & Liquid Cash",
    badge: "3 Accounts",
  },
};

export default meta;
type Story = StoryObj<typeof AppSectionDivider>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Emergency Buffer & Liquid Cash")).toBeInTheDocument();
    await expect(canvas.getByText("3 Accounts")).toBeInTheDocument();
  },
};
