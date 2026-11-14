import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Button } from "../Button";
import { Banner, InlineAlert, type InlineAlertTone } from "./InlineAlert";

const meta: Meta<typeof InlineAlert> = {
  title: "2. Primitives/InlineAlert",
  component: InlineAlert,
  parameters: { layout: "padded" },
  args: {
    title: "Your fixed rate ends in March",
    children: "Your repayment is likely to rise from £842.50 to about £1,016.20 a month.",
  },
};

export default meta;
type Story = StoryObj<typeof InlineAlert>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toBeInTheDocument();
  },
};

const TONES: InlineAlertTone[] = ["info", "positive", "warning", "danger", "neutral"];

export const Tones: Story = {
  render: () => (
    <div className={css({ display: "grid", gap: "3" })}>
      {TONES.map((tone) => (
        <InlineAlert key={tone} tone={tone} title={`This is a ${tone} message`}>
          Short supporting sentence in sentence case.
        </InlineAlert>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("status")).toHaveLength(4);
    await expect(canvas.getAllByRole("alert")).toHaveLength(1);
  },
};

export const WithAction: Story = {
  args: {
    tone: "warning",
    action: (
      <Button size="sm" variant="secondary">
        Review options
      </Button>
    ),
  },
};

export const Dismissible: Story = {
  args: { tone: "positive", title: "Payment plan saved", onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Dismiss" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

export const Danger: Story = {
  args: {
    tone: "danger",
    title: "We could not reach your bank",
    children: "Your balances may be out of date. Try again in a few minutes.",
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toBeInTheDocument();
  },
};

export const LongContent: Story = {
  args: {
    tone: "info",
    title: "Overpayments above £9,600 a year may trigger an early repayment charge",
    children:
      "Most fixed-rate mortgages let you overpay by up to 10% of the outstanding balance each year. Paying more than that, for example £14,250 on a £142,500 balance, can cost 1% to 5% of the extra amount. Check your offer letter or ask your lender before you commit to a larger lump sum.",
    onDismiss: fn(),
  },
};

export const BannerVariant: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <Banner
      tone="warning"
      title="Tax rates for 2026/27 are provisional"
      action={
        <Button size="sm" variant="secondary">
          See what changed
        </Button>
      }
      onDismiss={() => {}}
    >
      Figures update automatically once HMRC confirms the final rates.
    </Banner>
  ),
};

export const Dark: Story = { ...Tones, globals: { theme: "dark" } };

const infoArgs = {
  tone: "info" as const,
  title: "Your fixed rate ends on 31 March",
  children: "Choose a new deal before then to avoid moving to your lender's standard rate.",
  action: (
    <Button size="sm" variant="secondary">
      Compare deals
    </Button>
  ),
};

const infoPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("status")).toBeInTheDocument();
  await expect(canvas.getByRole("button", { name: "Compare deals" })).toBeInTheDocument();
};

/**
 * `tone="info"` is for actionable information only: something the user should do, with the action
 * to do it (E16 P4.5). Disclaimers and "guidance, not advice" wording never use it; they use the
 * quiet `ProjectionNotice` note instead.
 */
export const InfoIsForActions: Story = { args: infoArgs, play: infoPlay };

export const InfoIsForActionsDark: Story = {
  args: infoArgs,
  globals: { theme: "dark" },
  play: infoPlay,
};
