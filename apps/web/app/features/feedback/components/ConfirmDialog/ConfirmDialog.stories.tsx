import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

const meta: Meta<typeof ConfirmDialog> = {
  title: "3. Financial Patterns & Sections/ConfirmDialog",
  component: ConfirmDialog,
  // The Storybook decorator renders every story side by side in Light and Dark by default.
  parameters: { layout: "padded" },
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: "Delete 2024?",
    description: "This removes all monthly balances for 2024. This can't be undone.",
    confirmLabel: "Delete year",
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {};

export const Danger: Story = { args: { tone: "danger" } };

export const Pending: Story = { args: { tone: "danger", pending: true } };

export const RequireText: Story = {
  args: {
    tone: "danger",
    title: "Reset your profile?",
    description: "This clears your saved profile settings.",
    confirmLabel: "Reset",
    requireText: "RESET",
  },
};

function Interactive(props: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" id="open-confirm" onClick={() => setOpen(true)}>
        Open
      </button>
      <ConfirmDialog
        {...props}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          props.onOpenChange(next);
        }}
      />
    </>
  );
}

export const OpenCancelConfirm: Story = {
  args: { tone: "danger", open: false },
  render: (args) => <Interactive {...args} />,
  play: async ({ canvasElement, args }) => {
    const open = canvasElement.querySelector<HTMLButtonElement>("#open-confirm");
    if (!open) throw new Error("open button missing");
    await userEvent.click(open);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(args.onConfirm).not.toHaveBeenCalled();

    await userEvent.click(open);
    await userEvent.click(await screen.findByRole("button", { name: "Delete year" }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};
