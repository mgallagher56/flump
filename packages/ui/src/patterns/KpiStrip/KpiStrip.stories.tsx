import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Button } from "../../primitives/Button/Button";
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

const FourUp = () => (
  <KpiStrip columns={4}>
    <KpiCard
      delta={{ direction: "down", text: "-£240/mo", polarity: "liability" }}
      label="Total monthly outflow"
      subtext="Combined minimum payments"
      value="£315/mo"
    />
    <KpiCard
      delta={{ direction: "down", text: "14 months saved", polarity: "liability" }}
      label="Debt-free horizon"
      subtext="August 2026 via avalanche"
      value="18 months"
    />
    <KpiCard
      deltaText="Optimal"
      deltaVariant="brand"
      label="Lifetime interest saved"
      subtext="Compared with minimum payments"
      value="£2,140"
    />
    <KpiCard
      delta={{ direction: "up", text: "+£300", polarity: "liability" }}
      label="High APR liabilities"
      subtext="Overdraft and credit card debt"
      value="£4,200"
    />
  </KpiStrip>
);

const fourPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Total monthly outflow")).toBeInTheDocument();
  await expect(canvas.getByText("Debt-free horizon")).toBeInTheDocument();
};

export const FourColumns: Story = {
  render: () => <FourUp />,
  globals: { theme: "light" },
  play: fourPlay,
};

export const FourColumnsDark: Story = {
  render: () => <FourUp />,
  globals: { theme: "dark" },
  play: fourPlay,
};

export const ThreeColumns: Story = {
  render: () => (
    <KpiStrip columns={3}>
      <KpiCard label="Gross annual salary" value="£65,000" />
      <KpiCard
        deltaText="Salary sacrifice"
        deltaVariant="brand"
        label="Pension contribution"
        value="8.0%"
      />
      <KpiCard
        deltaText="England and NI"
        deltaVariant="neutral"
        label="Tax region"
        value="UK PAYE"
      />
    </KpiStrip>
  ),
  globals: { theme: "light" },
};

export const WithEmptyAndLoading: Story = {
  render: () => (
    <KpiStrip columns={4}>
      <KpiCard
        emptyAction={<Button size="sm">Add</Button>}
        label="Emergency fund"
        value={undefined}
      />
      <KpiCard label="Net worth" loading />
      <KpiCard label="Monthly surplus" value="£0" />
      <KpiCard label="Savings rate" value="12.5%" />
    </KpiStrip>
  ),
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Not set")).toBeInTheDocument();
    await expect(canvas.getByText("£0")).toBeInTheDocument();
  },
};

export const LongLabels: Story = {
  render: () => (
    <KpiStrip columns={4}>
      <KpiCard label="Cumulative overpayments across all unsecured borrowing" value="£12,345" />
      <KpiCard label="Self Assessment payment on account due 31 January" value="£3,210" />
      <KpiCard label="Marginal rate in the Personal Allowance taper" value="60%" />
      <KpiCard label="Employer pension contribution this tax year" value="£4,800" />
    </KpiStrip>
  ),
  globals: { theme: "dark" },
};
