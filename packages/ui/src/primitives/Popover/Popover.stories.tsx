import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Button } from "../Button";
import { Popover } from "./Popover";

const trigger = <Button variant="outline">Pay schedule</Button>;

const meta: Meta<typeof Popover> = {
  title: "2. Primitives/Popover",
  component: Popover,
  parameters: { layout: "centered" },
  args: {
    trigger,
    title: "When you get paid",
    children: "Your salary lands on the last working day of each month, usually by 9am.",
  },
  decorators: [
    (Story) => (
      <div className={css({ paddingY: "32", paddingX: "40" })}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const Small: Story = { args: { defaultOpen: true, size: "sm" } };

export const WithoutTitle: Story = {
  args: { defaultOpen: true, title: undefined, "aria-label": "Pay schedule details" },
};

export const NoCloseButton: Story = { args: { defaultOpen: true, showClose: false } };

export const LongContent: Story = {
  args: {
    defaultOpen: true,
    title: "How your take-home pay is worked out",
    children:
      "We start from your gross salary of £62,000, take off Income Tax and National Insurance for 2025/26, then your pension contribution, and show what is left after student loan repayments. Figures are rounded to the nearest pound.",
  },
};

/** Pointer and keyboard: opens on click, focus moves in, close button and Escape both close. */
export const FocusAndDismiss: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const button = within(canvasElement).getByRole("button", { name: "Pay schedule" });
    await userEvent.click(button);
    const dialog = await body.findByRole("dialog", { name: "When you get paid" });
    await waitFor(() =>
      expect(dialog.contains(canvasElement.ownerDocument.activeElement)).toBe(true),
    );
    await userEvent.click(body.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await expect(button).toHaveFocus();
    await userEvent.click(button);
    await body.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

export const Dark: Story = { ...Open, globals: { theme: "dark" } };
