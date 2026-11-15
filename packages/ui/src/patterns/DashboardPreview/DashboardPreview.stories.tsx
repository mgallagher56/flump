import type { Meta, StoryObj } from "@storybook/react";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { DashboardPreview } from "./DashboardPreview";

const meta: Meta<typeof DashboardPreview> = {
  title: "Patterns/DashboardPreview",
  component: DashboardPreview,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof DashboardPreview>;

export const Renter: Story = {
  args: {
    id: "story-dash-renter",
    household: "renter",
  },
  render: (args) => (
    <PreviewFrame id="frame-renter" title="Monthly picture">
      <DashboardPreview {...args} />
    </PreviewFrame>
  ),
};

export const Homeowner: Story = {
  args: {
    id: "story-dash-owner",
    household: "homeowner",
  },
  render: (args) => (
    <PreviewFrame id="frame-owner" title="Monthly picture">
      <DashboardPreview {...args} />
    </PreviewFrame>
  ),
};
