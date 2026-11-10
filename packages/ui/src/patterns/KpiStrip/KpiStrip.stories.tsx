import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { KpiStrip } from "./KpiStrip";

const meta: Meta<typeof KpiStrip> = {
  title: "3. Financial Patterns & Sections/KpiStrip",
  component: KpiStrip,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof KpiStrip>;

export const FourColumns: Story = {
  render: () => (
    <KpiStrip columns={4}>
      <KpiCard
        deltaText="-£240/mo"
        deltaVariant="positive"
        label="Total Monthly Outflow"
        subtext="Combined minimum payments"
        value="£315/mo"
      />
      <KpiCard
        deltaText="14 mos saved"
        deltaVariant="positive"
        label="Debt-Free Horizon"
        subtext="August 2026 via Avalanche"
        value="18 Months"
      />
      <KpiCard
        deltaText="Optimal"
        deltaVariant="brand"
        label="Lifetime Interest Saved"
        subtext="Vs paying mandatory minimums"
        value="£2,140"
      />
      <KpiCard
        deltaText="Action required"
        deltaVariant="danger"
        label="High APR Liabilities"
        subtext="Overdraft & credit card debt"
        value="£4,200"
      />
    </KpiStrip>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Total Monthly Outflow")).toBeInTheDocument();
    await expect(canvas.getByText("Debt-Free Horizon")).toBeInTheDocument();
  },
};

export const ThreeColumns: Story = {
  render: () => (
    <KpiStrip columns={3}>
      <KpiCard label="Gross Annual Salary" value="£65,000" />
      <KpiCard deltaText="Sal Sac" deltaVariant="brand" label="Pension Contribution" value="8.0%" />
      <KpiCard deltaText="England & NI" deltaVariant="neutral" label="Tax Region" value="UK PAYE" />
    </KpiStrip>
  ),
};
