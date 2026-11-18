import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { CheckInDaySetting } from "./CheckInDaySetting";

const meta: Meta<typeof CheckInDaySetting> = {
  title: "3. Patterns/Settings/CheckInDaySetting",
  component: CheckInDaySetting,
  parameters: { layout: "padded" },
  args: { checkInDay: null, onSave: fn(async () => undefined) },
};

export default meta;
type Story = StoryObj<typeof CheckInDaySetting>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByRole("combobox", { name: "Check-in day" });
    await expect(select).toHaveValue("1");
    await userEvent.selectOptions(select, "28");
    await expect(args.onSave).toHaveBeenCalledWith({ checkInDay: 28 });
  },
};

export const DayChosen: Story = { args: { checkInDay: 31 } };

export const SaveFails: Story = {
  args: { onSave: fn(async () => Promise.reject(new Error("failed"))) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Check-in day" }), "15");
    await expect(await canvas.findByRole("alert")).toBeDefined();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
