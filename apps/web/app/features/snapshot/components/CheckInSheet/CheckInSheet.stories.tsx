import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { EXAMPLE_ACCOUNTS, exampleDetails, TWO_MONTHS } from "../../fixtures";
import { CheckInSheet } from "./CheckInSheet";

const meta: Meta<typeof CheckInSheet> = {
  title: "3. Patterns/Snapshot/CheckInSheet",
  component: CheckInSheet,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onOpenChange: fn(),
    onSave: fn(async () => true),
    accounts: EXAMPLE_ACCOUNTS,
    accountDetails: exampleDetails(TWO_MONTHS),
    currentMonth: "2026-11",
    mode: "checkIn",
  },
};

export default meta;
type Story = StoryObj<typeof CheckInSheet>;

export const MonthlyCheckIn: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await expect((await body.findAllByText("Connected: updates from your bank"))[0]).toBeDefined();
    await userEvent.click(body.getAllByRole("button", { name: "Save balances" })[0] as HTMLElement);
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ month: "2026-11", saved: 3, skipped: 0 }),
    );
  },
};

export const PartialSave: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    const isa = (await body.findAllByRole("textbox", { name: "Stocks ISA: balance" }))[0];
    await userEvent.clear(isa as HTMLElement);
    await userEvent.click(body.getAllByRole("button", { name: "Save balances" })[0] as HTMLElement);
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ saved: 2, skipped: 1 }),
    );
  },
};

export const AddEarlierMonth: Story = {
  args: { mode: "backfill" },
  play: async () => {
    const body = within(document.body);
    await expect((await body.findAllByRole("combobox", { name: "Year" }))[0]).toBeDefined();
  },
};
