import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Check, Clock, Info, TriangleAlert } from "lucide-react";
import { css } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { StatusBadge } from "./StatusBadge";

const row = css({ display: "flex", flexWrap: "wrap", gap: "3", alignItems: "center" });

const meta: Meta<typeof StatusBadge> = {
  title: "2. Primitives/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  args: {
    children: "Highest rate first",
    variant: "positive",
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Positive: Story = {
  args: {
    variant: "positive",
    children: "+£12,480 interest saved",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("+£12,480 interest saved")).toBeInTheDocument();
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "0% promotion ends in 62 days",
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "62% marginal tax trap active",
  },
};

export const Info_: Story = {
  name: "Info",
  args: {
    variant: "info",
    children: "UK PAYE 2026 to 2027",
  },
};

export const Neutral: Story = {
  args: { variant: "neutral", children: "Not linked" },
};

export const Brand: Story = {
  args: { variant: "brand", children: "Recommended" },
};

/** The status labels from the Direction C sign-off frame: icon plus words, every one. */
export const SignoffLabels: Story = {
  render: () => (
    <div className={row}>
      <StatusBadge icon={<Icon icon={Check} size="sm" />} variant="positive">
        Paid on time
      </StatusBadge>
      <StatusBadge icon={<Icon icon={Clock} size="sm" />} variant="warning">
        Due in 3 days
      </StatusBadge>
      <StatusBadge icon={<Icon icon={TriangleAlert} size="sm" />} variant="danger">
        Overdue
      </StatusBadge>
      <StatusBadge icon={<Icon icon={Info} size="sm" />} variant="info">
        Estimate
      </StatusBadge>
      <StatusBadge variant="neutral">Not linked</StatusBadge>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const name of ["Paid on time", "Due in 3 days", "Overdue", "Estimate", "Not linked"]) {
      await expect(canvas.getByText(name)).toBeInTheDocument();
    }
  },
};

/** `showIcon` picks the standard icon for each tone. */
export const StandardIcons: Story = {
  render: () => (
    <div className={row}>
      <StatusBadge showIcon variant="positive">
        Paid on time
      </StatusBadge>
      <StatusBadge showIcon variant="warning">
        Due in 3 days
      </StatusBadge>
      <StatusBadge showIcon variant="danger">
        Overdue
      </StatusBadge>
      <StatusBadge showIcon variant="info">
        Estimate
      </StatusBadge>
      <StatusBadge showIcon variant="neutral">
        Not linked
      </StatusBadge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className={row}>
      <StatusBadge showIcon size="sm" variant="positive">
        Small, paid on time
      </StatusBadge>
      <StatusBadge showIcon size="md" variant="positive">
        Medium, paid on time
      </StatusBadge>
    </div>
  ),
};
