import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { DuplicateDebtNotice } from "./DuplicateDebtNotice";

const meta: Meta<typeof DuplicateDebtNotice> = {
  title: "3. Patterns/Budget/DuplicateDebtNotice",
  component: DuplicateDebtNotice,
  parameters: { layout: "padded" },
  args: {
    rowName: "Car loan payment",
    debtAccountName: "Car loan",
    monthlyAmount: 265,
    onMove: fn(async () => undefined),
    onKeep: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DuplicateDebtNotice>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const note = canvas.getAllByRole("note")[0];
    if (!note) throw new Error("Note missing");
    await expect(note).toHaveTextContent("£265 a month");
    const move = canvas.getAllByRole("button", { name: "Move to debts" })[0];
    if (!move) throw new Error("Move button missing");
    await userEvent.click(move);
    await expect(args.onMove).toHaveBeenCalled();
    const keep = canvas.getAllByRole("button", { name: "Keep it here" })[0];
    if (!keep) throw new Error("Keep button missing");
    await userEvent.click(keep);
    await expect(args.onKeep).toHaveBeenCalled();
  },
};

/** A long account name wraps inside the note. */
export const LongName: Story = {
  args: {
    rowName: "Barclaycard Platinum balance transfer card direct debit",
    debtAccountName: "Barclaycard Platinum balance transfer card",
    monthlyAmount: 1250,
  },
};
