import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { CheckInPreview, checkInAccountsFor } from "./CheckInPreview";

const meta: Meta<typeof CheckInPreview> = {
  title: "Patterns/CheckInPreview",
  component: CheckInPreview,
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <PreviewFrame id={`frame-${args.id}`} title="Monthly check-in">
      <CheckInPreview {...args} />
    </PreviewFrame>
  ),
};

export default meta;
type Story = StoryObj<typeof CheckInPreview>;

const playFor =
  (household: "renter" | "homeowner"): Story["play"] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [first, second] = checkInAccountsFor(household);
    if (!first || !second) return;
    await expect(canvas.getByRole("heading", { name: first.name })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "No change" }));
    await expect(canvas.getByRole("heading", { name: second.name })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Back" }));
    await expect(canvas.getByRole("heading", { name: first.name })).toBeVisible();
  };

export const Renter: Story = {
  args: { id: "story-checkin-renter", household: "renter" },
  globals: { theme: "light" },
  play: playFor("renter"),
};

export const RenterDark: Story = {
  args: { id: "story-checkin-renter-dark", household: "renter" },
  globals: { theme: "dark" },
  play: playFor("renter"),
};

export const Homeowner: Story = {
  args: { id: "story-checkin-owner", household: "homeowner" },
  globals: { theme: "light" },
  play: playFor("homeowner"),
};

export const HomeownerDark: Story = {
  args: { id: "story-checkin-owner-dark", household: "homeowner" },
  globals: { theme: "dark" },
  play: playFor("homeowner"),
};

/** Clearing the balance and pressing Update shows a plain message instead of saving £0. */
export const EmptyBalance: Story = {
  args: { id: "story-checkin-empty", household: "renter" },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByLabelText("New balance"));
    await userEvent.click(canvas.getByRole("button", { name: "Update" }));
    await expect(canvas.getByText("Enter a balance, or choose No change.")).toBeVisible();
  },
};
