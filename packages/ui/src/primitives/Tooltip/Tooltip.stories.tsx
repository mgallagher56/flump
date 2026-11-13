import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { Pencil, Trash2 } from "lucide-react";
import { css } from "../../../styled-system/css";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Tooltip } from "./Tooltip";

const iconButton = (label: string, icon = Pencil) => (
  <Button
    variant="outline"
    size="icon"
    aria-label={label}
    className={css({ borderRadius: "full" })}
  >
    <Icon icon={icon} size="sm" />
  </Button>
);

const meta: Meta<typeof Tooltip> = {
  title: "2. Primitives/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  args: { label: "Edit account", children: iconButton("Edit") },
  decorators: [
    (Story) => (
      <div className={css({ paddingY: "16", paddingX: "24" })}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

/** Open by default so the a11y check runs against the visible tooltip. */
export const Default: Story = { args: { defaultOpen: true } };

export const Bottom: Story = { args: { defaultOpen: true, side: "bottom" } };

export const LongLabel: Story = {
  args: {
    defaultOpen: true,
    label: "Remove this account from your net worth and stop syncing balances",
    children: iconButton("Remove", Trash2),
  },
};

/** Keyboard: Tab focuses the trigger and the tooltip appears; Escape dismisses it. */
export const ShowsOnFocusAndEscapeCloses: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Edit" })).toHaveFocus();
    const tip = await body.findByRole("tooltip");
    await expect(tip).toHaveTextContent("Edit account");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("tooltip")).toBeNull());
  },
};

export const ShowsOnHover: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.hover(within(canvasElement).getByRole("button", { name: "Edit" }));
    await expect(await body.findByRole("tooltip")).toBeInTheDocument();
  },
};

export const Dark: Story = { ...Default, globals: { theme: "dark" } };
