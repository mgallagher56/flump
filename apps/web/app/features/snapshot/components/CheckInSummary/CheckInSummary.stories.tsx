import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { CheckInSummary } from "./CheckInSummary";

const meta: Meta<typeof CheckInSummary> = {
  title: "3. Patterns/Snapshot/CheckInSummary",
  component: CheckInSummary,
  parameters: { layout: "padded" },
  args: {
    month: "2026-11",
    onDone: fn(),
    onChangeBalance: fn(),
    summary: {
      changed: [
        { accountId: "a", name: "Everyday account", value: 3412.5, calculated: false },
        { accountId: "b", name: "Residential mortgage", value: 185999.56, calculated: true },
      ],
      netWorth: 231400,
      change: 1250,
      previousMonth: "2026-10",
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckInSummary>;

export const Saved: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Net worth: £231,400, up £1,250 on October 2026.")).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    await expect(args.onDone).toHaveBeenCalled();
  },
};

export const SavedDark: Story = { ...Saved, globals: { theme: "dark" } };

export const NothingChanged: Story = {
  args: {
    summary: { changed: [], netWorth: 231400, change: 0, previousMonth: "2026-10" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No balances changed since October 2026.")).toBeDefined();
  },
};

export const NothingChangedDark: Story = { ...NothingChanged, globals: { theme: "dark" } };
