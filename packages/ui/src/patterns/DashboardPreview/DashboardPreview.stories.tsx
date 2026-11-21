import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { PreviewFrame } from "../PreviewFrame/PreviewFrame";
import { DashboardPreview } from "./DashboardPreview";

const meta: Meta<typeof DashboardPreview> = {
  title: "3. Patterns/DashboardPreview",
  component: DashboardPreview,
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <PreviewFrame id={`frame-${args.id}`} title="Monthly picture">
      <DashboardPreview {...args} />
    </PreviewFrame>
  ),
};

export default meta;
type Story = StoryObj<typeof DashboardPreview>;

const dashboardPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Left over each month")).toBeVisible();
  await expect(canvas.getByText("Spending each month")).toBeVisible();
  await expect(canvas.getByText(/^Breathing room: about /)).toBeVisible();
  // One figure, one place: the Budget card does not repeat the KPI.
  await expect(canvas.getAllByText("Left over each month")).toHaveLength(1);
};

export const Renter: Story = {
  args: { id: "story-dash-renter", household: "renter" },
  globals: { theme: "light" },
  play: dashboardPlay,
};

export const RenterDark: Story = {
  args: { id: "story-dash-renter-dark", household: "renter" },
  globals: { theme: "dark" },
  play: dashboardPlay,
};

export const Homeowner: Story = {
  args: { id: "story-dash-owner", household: "homeowner" },
  globals: { theme: "light" },
  play: dashboardPlay,
};

export const HomeownerDark: Story = {
  args: { id: "story-dash-owner-dark", household: "homeowner" },
  globals: { theme: "dark" },
  play: dashboardPlay,
};
