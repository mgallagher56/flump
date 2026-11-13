import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";

// The full story set lives with the component in `packages/ui` (E15 T2.5). This single story
// proves the legacy import path still renders while screens migrate.
const meta: Meta<typeof ConfirmDialog> = {
  title: "9. Legacy/ConfirmDialog web re-export",
  component: ConfirmDialog,
  parameters: { layout: "padded" },
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: "Delete 2024?",
    description: "This removes all monthly balances for 2024. This can't be undone.",
    confirmLabel: "Delete year",
    tone: "danger",
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {};
