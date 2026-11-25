import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LeaveHouseholdSection } from "./LeaveHouseholdSection";

const meta: Meta<typeof LeaveHouseholdSection> = {
  title: "3. Patterns/Household/LeaveHouseholdSection",
  component: LeaveHouseholdSection,
  parameters: { layout: "padded" },
  args: { pending: false, error: null, onConfirm: fn() },
};

export default meta;
type Story = StoryObj<typeof LeaveHouseholdSection>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const ConfirmOpen: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Leave household" }));
    const body = within(document.body);
    await expect(await body.findByRole("alertdialog")).toBeInTheDocument();
  },
};
