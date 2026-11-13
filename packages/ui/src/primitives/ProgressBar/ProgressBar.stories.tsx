import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { ProgressBar } from "./ProgressBar";

const frame = css({ width: "min(480px, 90vw)" });
const stack = css({ display: "flex", flexDirection: "column", gap: "5" });

const meta: Meta<typeof ProgressBar> = {
  title: "2. Primitives/ProgressBar",
  component: ProgressBar,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className={frame}>
        <Story />
      </div>
    ),
  ],
  args: {
    label: "£20,000 ISA annual allowance",
    value: 12000,
    max: 20000,
    showPercent: true,
    variant: "positive",
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Positive: Story = {
  args: {
    variant: "positive",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar");
    await expect(bar).toBeInTheDocument();
    await expect(bar).toHaveAttribute("aria-valuenow", "12000");
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "20000");
    await expect(bar).toHaveAttribute("aria-valuetext", "60%");
    await expect(canvas.getByText("60%")).toBeInTheDocument();
  },
};

export const Warning: Story = {
  args: {
    value: 18500,
    variant: "warning",
  },
};

export const Danger: Story = {
  args: {
    value: 20000,
    variant: "danger",
    valueDisplay: "£20,000 of £20,000 used",
    valueText: "Allowance fully used",
  },
};

export const Primary: Story = {
  args: { variant: "primary", value: 4500, max: 12000, showPercent: false },
};

export const Neutral: Story = {
  args: { variant: "neutral", value: 3, max: 12, showPercent: false, label: "Months saved" },
};

export const Sizes: Story = {
  render: () => (
    <div className={stack}>
      <ProgressBar label="Small" size="sm" showPercent value={40} />
      <ProgressBar label="Medium (default)" size="md" showPercent value={40} />
      <ProgressBar label="Large" size="lg" showPercent value={40} />
    </div>
  ),
};

export const Empty: Story = {
  args: { value: 0, label: "Emergency fund, nothing saved yet" },
};

export const LongLabel: Story = {
  args: {
    label: "Cash ISA and stocks and shares ISA allowance used across all providers this tax year",
    value: 15000,
    valueDisplay: "£15,000 of £20,000",
    valueText: "£15,000 of £20,000 used",
  },
};

export const NoLabel: Story = {
  args: { label: undefined, showPercent: false, valueDisplay: undefined, value: 65 },
};
