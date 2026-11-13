import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Button } from "../Button/Button";
import { Money } from "../Money/Money";
import { KpiCard } from "./KpiCard";

const frame = css({ width: "20rem", maxWidth: "100%" });
const compactFrame = css({ width: "14rem", maxWidth: "100%" });

const meta: Meta<typeof KpiCard> = {
  title: "2. Primitives/KpiCard",
  component: KpiCard,
  parameters: {
    layout: "centered",
  },
  args: {
    label: "Debt-free horizon",
    value: "August 2026",
    deltaText: "14 months saved",
    deltaVariant: "positive",
    subtext: "Using the avalanche method with +£50/mo overpayment",
  },
  decorators: [
    (Story) => (
      <div className={frame}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

const defaultPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByText("Debt-free horizon").length).toBeGreaterThan(0);
  await expect(canvas.getAllByText("August 2026").length).toBeGreaterThan(0);
};

export const Default: Story = { play: defaultPlay };

export const Light: Story = { globals: { theme: "light" }, play: defaultPlay };

export const Dark: Story = { globals: { theme: "dark" }, play: defaultPlay };

const emptyPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Not set")).toBeInTheDocument();
  await expect(canvas.getByRole("button", { name: "Add balance" })).toBeInTheDocument();
};

const emptyArgs = {
  label: "Savings balance",
  value: null,
  deltaText: undefined,
  subtext: "Add a balance to see this figure",
  emptyAction: <Button size="sm">Add balance</Button>,
};

export const Empty: Story = { args: emptyArgs, globals: { theme: "light" }, play: emptyPlay };

export const EmptyDark: Story = { args: emptyArgs, globals: { theme: "dark" }, play: emptyPlay };

export const Loading: Story = {
  args: { label: "Net worth", loading: true, deltaText: undefined, subtext: undefined },
  globals: { theme: "light" },
};

const liabilityArgs = {
  label: "Mortgage balance",
  value: "£182,450",
  deltaText: undefined,
  delta: { direction: "down" as const, text: "-£1,240 this month", polarity: "liability" as const },
  subtext: "A falling balance is good news",
};

const liabilityPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("-£1,240 this month")).toBeInTheDocument();
  await expect(canvas.getByText("Down")).toBeInTheDocument();
};

export const LiabilityDelta: Story = {
  args: liabilityArgs,
  globals: { theme: "light" },
  play: liabilityPlay,
};

export const LiabilityDeltaDark: Story = {
  args: liabilityArgs,
  globals: { theme: "dark" },
  play: liabilityPlay,
};

export const AssetDeltaDown: Story = {
  args: {
    label: "Pension pot",
    value: "£61,300",
    deltaText: undefined,
    delta: { direction: "down", text: "-£820 market movement" },
    subtext: undefined,
  },
  globals: { theme: "light" },
};

export const LongBritishLabel: Story = {
  args: {
    label: "Cumulative interest saved by overpaying the credit consolidation loan",
    value: "£1,234,567",
    deltaText: undefined,
    delta: { direction: "up", text: "+£12,345 since last tax year" },
    subtext: "Figures are shown for the 2026/27 tax year",
  },
  globals: { theme: "light" },
};

const heroArgs = {
  label: "Net worth",
  value: <Money size="lg" tone="onContrast" value={184250} />,
  deltaText: undefined,
  subtext: "Assets £214,000 • Liabilities £29,750",
  tone: "hero" as const,
};

const heroPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("£184,250")).toBeInTheDocument();
  await expect(canvasElement.querySelector('[data-tone="hero"]')).not.toBeNull();
};

export const Hero: Story = { args: heroArgs, globals: { theme: "light" }, play: heroPlay };

export const HeroDark: Story = { args: heroArgs, globals: { theme: "dark" }, play: heroPlay };

const numericArgs = {
  label: "Net worth",
  value: -1234567,
  deltaText: undefined,
  delta: { direction: "down" as const, text: "-£12,400 this year" },
  subtext: "Numbers are formatted by Money",
};

const numericPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("minus £1,234,567")).toBeInTheDocument();
};

export const NumericValue: Story = {
  args: numericArgs,
  globals: { theme: "light" },
  play: numericPlay,
};

export const NumericValueDark: Story = {
  args: numericArgs,
  globals: { theme: "dark" },
  play: numericPlay,
};

export const Compact: Story = {
  args: { label: "Pension pot", value: 97800, deltaText: undefined, subtext: "Compact notation" },
  render: (args) => (
    <div className={compactFrame} data-density="compact">
      <KpiCard {...args} valueFormat={{ compact: true }} />
    </div>
  ),
  globals: { theme: "light" },
};

export const NotSetWithAction: Story = {
  args: { ...emptyArgs, subtext: undefined },
  globals: { theme: "dark" },
  play: emptyPlay,
};
