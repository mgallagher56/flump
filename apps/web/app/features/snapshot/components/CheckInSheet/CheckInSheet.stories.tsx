import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  CHECK_IN_ACCOUNTS,
  CHECK_IN_DETAILS,
  EXAMPLE_ACCOUNTS,
  exampleDetails,
  TWO_MONTHS,
} from "../../fixtures";
import { CheckInSheet } from "./CheckInSheet";

const meta: Meta<typeof CheckInSheet> = {
  title: "3. Patterns/Snapshot/CheckInSheet",
  component: CheckInSheet,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onOpenChange: fn(),
    onSave: fn(async () => true),
    accounts: CHECK_IN_ACCOUNTS,
    accountDetails: CHECK_IN_DETAILS,
    currentMonth: "2026-11",
    mode: "checkIn",
    basis: DEFAULT_NET_WORTH_BASIS,
  },
};

export default meta;
type Story = StoryObj<typeof CheckInSheet>;

export const MonthlyCheckIn: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    const field = await body.findByRole("textbox", { name: /New balance.*Everyday account/ });
    await userEvent.type(field, "3412.50{Enter}");
    await expect(args.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ month: "2026-11", quiet: true }),
    );
    await expect(await body.findByText("Updated £3,412.50")).toBeDefined();
  },
};

export const MonthlyCheckInDark: Story = { ...MonthlyCheckIn, globals: { theme: "dark" } };

export const NoChangeToTheRest: Story = {
  play: async ({ args }) => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole("button", { name: "No change to the rest" }));
    await expect(await body.findByRole("heading", { name: "Check-in saved" })).toBeDefined();
    await expect(args.onSave).toHaveBeenCalledTimes(1);
  },
};

export const NoChangeToTheRestDark: Story = { ...NoChangeToTheRest, globals: { theme: "dark" } };

export const AddEarlierMonth: Story = {
  args: {
    mode: "backfill",
    accounts: EXAMPLE_ACCOUNTS,
    accountDetails: exampleDetails(TWO_MONTHS),
  },
  play: async () => {
    const body = within(document.body);
    await expect((await body.findAllByRole("combobox", { name: "Year" }))[0]).toBeDefined();
  },
};

export const AddEarlierMonthDark: Story = { ...AddEarlierMonth, globals: { theme: "dark" } };
