import { buildFinancialPicture, SAMPLE_HOUSEHOLDS } from "@flump/finance-engine";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { BreathingRoomPreview } from "./BreathingRoomPreview";
import { BREATHING_ROOM_DESCRIPTION, breathingRoomValue } from "./BreathingRoomPreview.wording";

const meta: Meta<typeof BreathingRoomPreview> = {
  title: "3. Patterns/BreathingRoomPreview",
  component: BreathingRoomPreview,
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <PreviewFrame id={`frame-${args.id}`} title="Breathing room">
      <BreathingRoomPreview {...args} />
    </PreviewFrame>
  ),
};

export default meta;
type Story = StoryObj<typeof BreathingRoomPreview>;

const savedMonths = (household: "renter" | "homeowner") => {
  const cover = buildFinancialPicture(SAMPLE_HOUSEHOLDS[household].fixture).monthsOfCover;
  return cover.status === "known" ? cover.value.months : 0;
};

const playFor =
  (household: "renter" | "homeowner"): Story["play"] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Breathing room", { selector: "p" })).toBeVisible();
    await expect(canvas.getByText(breathingRoomValue(savedMonths(household)))).toBeVisible();
    await expect(canvas.getByText(BREATHING_ROOM_DESCRIPTION)).toBeVisible();
  };

export const Renter: Story = {
  args: { id: "story-br-renter", household: "renter" },
  globals: { theme: "light" },
  play: playFor("renter"),
};

export const RenterDark: Story = {
  args: { id: "story-br-renter-dark", household: "renter" },
  globals: { theme: "dark" },
  play: playFor("renter"),
};

export const Homeowner: Story = {
  args: { id: "story-br-owner", household: "homeowner" },
  globals: { theme: "light" },
  play: playFor("homeowner"),
};

export const HomeownerDark: Story = {
  args: { id: "story-br-owner-dark", household: "homeowner" },
  globals: { theme: "dark" },
  play: playFor("homeowner"),
};
