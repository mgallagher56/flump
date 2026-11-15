import type { Meta, StoryObj } from "@storybook/react";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { CheckInPreview } from "./CheckInPreview";

const meta: Meta<typeof CheckInPreview> = {
  title: "Patterns/CheckInPreview",
  component: CheckInPreview,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof CheckInPreview>;

export const Renter: Story = {
  args: {
    id: "story-checkin-renter",
    household: "renter",
  },
  render: (args) => (
    <PreviewFrame id="frame-checkin-renter" title="Monthly check-in">
      <CheckInPreview {...args} />
    </PreviewFrame>
  ),
};

export const Homeowner: Story = {
  args: {
    id: "story-checkin-owner",
    household: "homeowner",
  },
  render: (args) => (
    <PreviewFrame id="frame-checkin-owner" title="Monthly check-in">
      <CheckInPreview {...args} />
    </PreviewFrame>
  ),
};
