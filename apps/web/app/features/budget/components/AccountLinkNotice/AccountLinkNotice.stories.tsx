import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { AccountLinkNotice } from "./AccountLinkNotice";

const meta: Meta<typeof AccountLinkNotice> = {
  title: "3. Patterns/Budget/AccountLinkNotice",
  component: AccountLinkNotice,
  parameters: { layout: "padded" },
  args: {
    offer: { rowName: "Car loan payment", accountName: "Car loan", monthly: 265, link: "debt" },
    onLink: fn(async () => undefined),
    onKeep: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AccountLinkNotice>;

// The Storybook decorator renders light and dark side by side, so queries use the first match.
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const note = canvas.getAllByRole("note")[0];
    if (!note) throw new Error("Note missing");
    await expect(note).toHaveTextContent("£265 a month on Car loan");
    const link = canvas.getAllByRole("button", { name: "Link to Car loan" })[0];
    if (!link) throw new Error("Link button missing");
    await userEvent.click(link);
    await expect(args.onLink).toHaveBeenCalled();
    const keep = canvas.getAllByRole("button", { name: "Keep my own figure" })[0];
    if (!keep) throw new Error("Keep button missing");
    await userEvent.click(keep);
    await expect(args.onKeep).toHaveBeenCalled();
  },
};

/** A savings entry. */
export const Savings: Story = {
  args: {
    offer: { rowName: "Savings", accountName: "Easy access saver", monthly: 250, link: "savings" },
  },
};

/** A long account name wraps inside the note. */
export const LongName: Story = {
  args: {
    offer: {
      rowName: "Barclaycard Platinum balance transfer card direct debit",
      accountName: "Barclaycard Platinum balance transfer card",
      monthly: 1250,
      link: "debt",
    },
  },
};
