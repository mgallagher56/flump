import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

const meta: Meta<typeof UnsavedChangesDialog> = {
  title: "3. Financial Patterns & Sections/Settings/UnsavedChangesDialog",
  component: UnsavedChangesDialog,
  args: { open: true, onDiscard: fn(), onKeepEditing: fn() },
};

export default meta;
type Story = StoryObj<typeof UnsavedChangesDialog>;

export const Open: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "Keep editing" }));
    await expect(args.onKeepEditing).toHaveBeenCalled();
  },
};
