import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Button } from "../Button/Button";
import { KpiCard } from "./KpiCard";

const frame = css({ width: "20rem", maxWidth: "100%" });

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
  await expect(canvas.getByText("Debt-free horizon")).toBeInTheDocument();
  await expect(canvas.getByText("August 2026")).toBeInTheDocument();
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
