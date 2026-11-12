import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";
import { Dialog } from "./Dialog";

const Demo = (args: Partial<React.ComponentProps<typeof Dialog>>) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add liability account"
        description="Only the name and balance are required."
        {...args}
      >
        <input aria-label="Account name" />
      </Dialog>
    </>
  );
};

const meta: Meta<typeof Dialog> = {
  title: "2. Primitives/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
  render: (args) => <Demo {...args} />,
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("dialog", { name: "Add liability account" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  },
};

/** Separate from Default so the a11y check still runs against an open dialog. */
export const EscapeCloses: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("dialog", { name: "Add liability account" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

export const Large: Story = { args: { size: "lg" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };
