import type { Meta, StoryObj } from "@storybook/react";
import type { FC } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { CHECK_IN_ACCOUNTS, CHECK_IN_DETAILS } from "../../fixtures";
import { useCheckIn } from "../../useCheckIn";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { CheckInList } from "./CheckInList";

const Demo: FC<{ onSave: SaveSnapshot }> = ({ onSave }) => {
  const checkIn = useCheckIn({
    accounts: CHECK_IN_ACCOUNTS,
    accountDetails: CHECK_IN_DETAILS,
    month: "2026-11",
    open: true,
    onSave,
  });
  return <CheckInList checkIn={checkIn} />;
};

const [everyday, , , card] = CHECK_IN_ACCOUNTS.map((a) => a.id) as [string, string, string, string];

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Snapshot/CheckInList",
  component: Demo,
  parameters: { layout: "padded" },
  args: { onSave: fn(async () => true) },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const KeyboardFlow: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId(`checkin-value-${everyday}`));
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(document.activeElement).toBe(canvas.getByTestId(`checkin-value-${card}`)),
    );
    await expect(args.onSave).toHaveBeenCalledTimes(1);
    await expect((await canvas.findByTestId(`checkin-status-${everyday}`)).textContent).toBe(
      "No change",
    );
  },
};

export const KeyboardFlowDark: Story = { ...KeyboardFlow, globals: { theme: "dark" } };
