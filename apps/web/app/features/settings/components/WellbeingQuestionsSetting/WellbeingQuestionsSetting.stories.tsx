import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { WellbeingQuestionsSetting } from "./WellbeingQuestionsSetting";

const meta: Meta<typeof WellbeingQuestionsSetting> = {
  title: "3. Patterns/Settings/WellbeingQuestionsSetting",
  component: WellbeingQuestionsSetting,
  parameters: { layout: "padded" },
  args: { enabled: true, onSave: fn(async () => undefined) },
};

export default meta;
type Story = StoryObj<typeof WellbeingQuestionsSetting>;

const control = (el: HTMLElement) =>
  within(el).getByRole("switch", { name: "Ask two optional questions after a check-in" });

export const On: Story = {
  play: async ({ canvasElement, args }) => {
    await expect(control(canvasElement)).toBeChecked();
    await userEvent.click(control(canvasElement));
    await expect(args.onSave).toHaveBeenCalledWith({ wellbeingQuestions: false });
  },
};
export const OnDark: Story = { ...On, globals: { theme: "dark" } };

export const Off: Story = { args: { enabled: false } };
export const OffDark: Story = { ...Off, globals: { theme: "dark" } };

export const SaveFails: Story = {
  args: { onSave: fn(async () => Promise.reject(new Error("failed"))) },
  play: async ({ canvasElement }) => {
    await userEvent.click(control(canvasElement));
    await expect(await within(canvasElement).findByRole("alert")).toBeDefined();
    await expect(control(canvasElement)).toBeChecked();
  },
};
export const SaveFailsDark: Story = { ...SaveFails, globals: { theme: "dark" } };
