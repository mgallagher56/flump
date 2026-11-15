import type { Meta, StoryObj } from "@storybook/react";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { BreathingRoomPreview } from "./BreathingRoomPreview";

const meta: Meta<typeof BreathingRoomPreview> = {
  title: "Patterns/BreathingRoomPreview",
  component: BreathingRoomPreview,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof BreathingRoomPreview>;

export const Renter: Story = {
  args: {
    id: "story-br-renter",
    household: "renter",
  },
  render: (args) => (
    <PreviewFrame id="frame-br-renter" title="Model a change">
      <BreathingRoomPreview {...args} />
    </PreviewFrame>
  ),
};

export const Homeowner: Story = {
  args: {
    id: "story-br-owner",
    household: "homeowner",
  },
  render: (args) => (
    <PreviewFrame id="frame-br-owner" title="Model a change">
      <BreathingRoomPreview {...args} />
    </PreviewFrame>
  ),
};
