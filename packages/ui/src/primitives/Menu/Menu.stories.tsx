import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { Icon } from "../Icon";
import { InfoTip } from "../InfoTip";
import { Popover } from "../Popover";
import { Tooltip } from "../Tooltip";
import { Menu, type MenuEntry } from "./Menu";

const trigger = (
  <Button
    variant="outline"
    size="icon"
    aria-label="Account actions"
    className={css({ borderRadius: "full" })}
  >
    <Icon icon={MoreHorizontal} size="sm" />
  </Button>
);

const meta: Meta<typeof Menu> = {
  title: "2. Primitives/Menu",
  component: Menu,
  parameters: { layout: "centered" },
  args: {
    trigger,
    "aria-label": "Account actions",
    items: [
      { id: "edit", label: "Edit account", icon: Pencil, onSelect: fn() },
      { id: "export", label: "Export transactions", icon: Download, shortcut: "Ctrl+E" },
      { id: "archive", label: "Archive account", disabled: true },
      { type: "separator" },
      { id: "delete", label: "Delete account", icon: Trash2, tone: "danger", onSelect: fn() },
    ],
  },
  decorators: [
    (Story) => (
      <div className={css({ paddingTop: "16", paddingBottom: "60", paddingX: "40" })}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Menu>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const WithGroupLabel: Story = {
  args: {
    defaultOpen: true,
    items: [
      { type: "label", label: "Joint account" },
      { id: "rename", label: "Rename" },
      { id: "share", label: "Share with partner" },
      { type: "separator" },
      { type: "label", label: "Danger zone" },
      { id: "disconnect", label: "Disconnect bank", tone: "danger" },
    ],
  },
};

/** Keyboard: Enter opens, arrows move, typeahead jumps, Escape closes and focus returns. */
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = within(canvasElement).getByRole("button", { name: "Account actions" });
    button.focus();
    await userEvent.keyboard("{Enter}");
    const menu = await body.findByRole("menu", { name: "Account actions" });
    await expect(menu).toBeInTheDocument();
    await waitFor(() => expect(body.getByRole("menuitem", { name: /Edit account/ })).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await expect(body.getByRole("menuitem", { name: /Export transactions/ })).toHaveFocus();
    await userEvent.keyboard("d");
    await expect(body.getByRole("menuitem", { name: /Delete account/ })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull());
    await expect(button).toHaveFocus();
  },
};

/** Pointer: click opens, choosing an item fires onSelect and closes. */
export const PointerSelect: Story = {
  play: async ({ canvasElement, args }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Account actions" }));
    await userEvent.click(await body.findByRole("menuitem", { name: /Edit account/ }));
    const edit = args.items[0];
    if (edit && edit.type !== "separator" && edit.type !== "label") {
      await expect(edit.onSelect).toHaveBeenCalled();
    }
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull());
  },
};

export const Dark: Story = { ...Open, globals: { theme: "dark" } };

/** Shortcut text is a visual hint only: no key handler is wired to it. */
export const ShortcutHintOnly: Story = {
  args: {
    defaultOpen: true,
    items: [
      { id: "export", label: "Export transactions", shortcut: "Ctrl+E" },
      { id: "print", label: "Print statement", shortcut: "Ctrl+P" },
    ],
  },
};

const menuItems: MenuEntry[] = [
  { id: "edit", label: "Edit account", icon: Pencil },
  { type: "separator" },
  { id: "delete", label: "Delete account", icon: Trash2, tone: "danger" },
];

const InsideDialogDemo = () => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Account settings" size="md">
      <div className={css({ display: "flex", alignItems: "center", gap: "3" })}>
        <Menu aria-label="Account actions" trigger={trigger} items={menuItems} />
        <Popover title="Pay schedule" trigger={<Button variant="outline">Pay schedule</Button>}>
          Paid on the last working day.
        </Popover>
        <InfoTip term="Personal Allowance">The amount you can earn tax free.</InfoTip>
        <Tooltip label="Edit account">
          <Button variant="outline" size="icon" aria-label="Edit">
            <Icon icon={Pencil} size="sm" />
          </Button>
        </Tooltip>
      </div>
    </Dialog>
  );
};

/**
 * Overlays inside a Dialog sit above it (z-index 250/260 over 200/201). Escape closes only the
 * overlay that is open, the dialog stays, and focus returns to the overlay's trigger.
 */
export const InsideDialog: Story = {
  render: () => <InsideDialogDemo />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("dialog", { name: "Account settings" });

    const infoTrigger = body.getByRole("button", { name: "About Personal Allowance" });
    await userEvent.click(infoTrigger);
    await body.findByRole("dialog", { name: "Personal Allowance" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(body.queryByRole("dialog", { name: "Personal Allowance" })).toBeNull(),
    );
    await expect(body.getByRole("dialog", { name: "Account settings" })).toBeInTheDocument();
    await expect(infoTrigger).toHaveFocus();

    const menuTrigger = body.getByRole("button", { name: "Account actions" });
    await userEvent.click(menuTrigger);
    await body.findByRole("menu", { name: "Account actions" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("menu")).toBeNull());
    await expect(body.getByRole("dialog", { name: "Account settings" })).toBeInTheDocument();
    await expect(menuTrigger).toHaveFocus();
  },
};
