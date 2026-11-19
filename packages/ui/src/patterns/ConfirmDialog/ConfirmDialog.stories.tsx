import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useEffect, useState } from "react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { CONFIRM_ARMING_DELAY_MS, ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

/** Portalled content escapes the preview's themed wrapper, so theme the document root too. */
const DarkRoot = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    return () => {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
    };
  }, []);
  return children;
};

const meta: Meta<typeof ConfirmDialog> = {
  title: "3. Patterns/ConfirmDialog",
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
    scope: "single",
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {};

export const Danger: Story = { args: { tone: "danger" } };

/** Wide-reaching: focus starts on Cancel, and Enter confirms only from Confirm (UX D1). */
export const Bulk: Story = {
  args: {
    tone: "danger",
    scope: "bulk",
    title: "Delete every record for 2024/25?",
    description: "This removes all 12 records for the tax year. This can't be undone.",
    confirmLabel: "Delete all records",
  },
};

/** Portalled content escapes the side-by-side frames, so dark gets its own story. */
export const DangerDark: Story = {
  args: { tone: "danger" },
  globals: { theme: "dark" },
  decorators: [
    (Story) => (
      <DarkRoot>
        <Story />
      </DarkRoot>
    ),
  ],
};

export const WithError: Story = {
  args: { tone: "danger", error: "We couldn't reach the server. Please try again." },
};

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

/**
 * On a 320px phone the typed confirmation opens at its title, not scrolled to Cancel, and the
 * field is 16px so iOS does not zoom (phone audit P09).
 */
const requireTextPhonePlay: Story["play"] = async () => {
  const dialog = await screen.findByRole("alertdialog");
  await expect(dialog.scrollTop).toBe(0);
  const title = screen.getByRole("heading", { name: "Reset your profile?" });
  await expect(title.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
  await expect(getComputedStyle(screen.getByRole("textbox")).fontSize).toBe("16px");
};

export const RequireTextPhone: Story = {
  ...RequireText,
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: requireTextPhonePlay,
};

export const RequireTextPhoneDark: Story = {
  ...RequireTextPhone,
  globals: { theme: "dark" },
  decorators: [
    (Story) => (
      <DarkRoot>
        <Story />
      </DarkRoot>
    ),
  ],
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

/** Owner item 27: Enter confirms an ordinary delete, once. */
export const EnterConfirms: Story = {
  args: { tone: "danger", open: false },
  render: (args) => <Interactive {...args} />,
  play: async ({ args, canvasElement }) => {
    const open = canvasElement.querySelector<HTMLButtonElement>("#open-confirm");
    if (!open) throw new Error("open button missing");
    await userEvent.click(open);
    await screen.findByRole("alertdialog");
    // Enter waits out the arming delay after opening, so a double press cannot confirm.
    await new Promise((resolve) => setTimeout(resolve, CONFIRM_ARMING_DELAY_MS + 50));
    await userEvent.keyboard("{Enter}");
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

/** Separate from the others so the a11y check still runs against an open dialog. */
export const EscapeClosesAndReturnsFocus: Story = {
  args: { tone: "danger", open: false },
  render: (args) => <Interactive {...args} />,
  play: async ({ canvasElement }) => {
    const open = canvasElement.querySelector<HTMLButtonElement>("#open-confirm");
    if (!open) throw new Error("open button missing");
    await userEvent.click(open);
    const confirm = await screen.findByRole("button", { name: "Delete year" });
    await expect(confirm).toHaveFocus();
    const dialog = await screen.findByRole("alertdialog");
    for (let i = 0; i < 4; i += 1) {
      await userEvent.tab();
      await expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(open).toHaveFocus());
  },
};
