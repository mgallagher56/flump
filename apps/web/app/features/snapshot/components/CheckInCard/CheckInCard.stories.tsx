import type { Meta, StoryObj } from "@storybook/react";
import type { FC } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { CHECK_IN_ACCOUNTS, CHECK_IN_DETAILS } from "../../fixtures";
import { useCheckIn } from "../../useCheckIn";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { CheckInCard } from "./CheckInCard";

const Demo: FC<{ onSave: SaveSnapshot }> = ({ onSave }) => {
  const checkIn = useCheckIn({
    accounts: CHECK_IN_ACCOUNTS,
    accountDetails: CHECK_IN_DETAILS,
    month: "2026-11",
    open: true,
    onSave,
  });
  return <CheckInCard checkIn={checkIn} />;
};

const meta: Meta<typeof Demo> = {
  title: "3. Patterns/Snapshot/CheckInCard",
  component: Demo,
  parameters: { layout: "padded", viewport: { defaultViewport: "mobile1" } },
  args: { onSave: fn(async () => true) },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const OneAccountAtATime: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("1 of 4")).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "No change" }));
    await expect(await canvas.findByText("2 of 4")).toBeDefined();
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(await canvas.findByText("1 of 4")).toBeDefined();
  },
};

export const OneAccountAtATimeDark: Story = { ...OneAccountAtATime, globals: { theme: "dark" } };
