import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Money } from "../Money/Money";
import { KpiCard } from "./KpiCard";

const link = css({ color: "primary", textDecoration: "underline", fontWeight: "medium" });
const AddLink = ({ children }: { children: string }) => (
  <a className={link} href="#details">
    {children}
  </a>
);

const frame = css({ width: "20rem", maxWidth: "100%" });
const compactFrame = css({ width: "14rem", maxWidth: "100%" });

const meta: Meta<typeof KpiCard> = {
  title: "2. Primitives/KpiCard",
  component: KpiCard,
  parameters: {
    layout: "centered",
  },
  args: {
    label: "Debt-free date",
    value: "Aug 2026",
    deltaText: "14 months sooner",
    deltaVariant: "positive",
    subtext: "With an extra £50 a month",
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
  await expect(canvas.getAllByText("Debt-free date").length).toBeGreaterThan(0);
  await expect(canvas.getAllByText("Aug 2026").length).toBeGreaterThan(0);
};

export const Default: Story = { play: defaultPlay };

export const Light: Story = { globals: { theme: "light" }, play: defaultPlay };

export const Dark: Story = { globals: { theme: "dark" }, play: defaultPlay };

const emptyPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Not set")).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Add a balance" })).toBeInTheDocument();
};

const emptyArgs = {
  label: "Savings balance",
  value: null,
  deltaText: undefined,
  subtext: undefined,
  emptyAction: <AddLink>Add a balance</AddLink>,
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
  subtext: "What you own minus what you owe",
  tone: "hero" as const,
};

const heroPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("£184,250")).toBeInTheDocument();
  await expect(canvasElement.querySelector('[data-tone="hero"]')).not.toBeNull();
};

/** Deprecated: use `HeroFigure` for the page's one headline figure. Kept while screens move over. */
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

const noCaptionArgs = {
  label: "Savings",
  value: 12400,
  deltaText: undefined,
  subtext: undefined,
};

const noCaptionPlay: Story["play"] = async ({ canvasElement }) => {
  await expect(within(canvasElement).getByText("£12,400")).toBeInTheDocument();
};

/** The caption is optional: leave it out when the label says enough (E16 P1.5). */
export const NoCaption: Story = {
  args: noCaptionArgs,
  globals: { theme: "light" },
  play: noCaptionPlay,
};

export const NoCaptionDark: Story = {
  args: noCaptionArgs,
  globals: { theme: "dark" },
  play: noCaptionPlay,
};

const notSetArgs = {
  label: "Interest rate",
  value: null,
  deltaText: undefined,
  subtext: undefined,
  emptyAction: <AddLink>Add your rate</AddLink>,
};

const notSetPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const notSet = canvas.getByText("Not set");
  await expect(canvas.getByRole("link", { name: "Add your rate" })).toBeInTheDocument();
  // Smaller and lighter than a real value (numeric.unset is body size, regular weight).
  const style = getComputedStyle(notSet);
  await expect(Number.parseFloat(style.fontSize)).toBeLessThanOrEqual(16);
  await expect(Number(style.fontWeight)).toBeLessThanOrEqual(400);
};

/** "Not set" in `numeric.unset` with one action link (E16 P3.1). */
export const NotSet: Story = { args: notSetArgs, globals: { theme: "light" }, play: notSetPlay };

export const NotSetDark: Story = { args: notSetArgs, globals: { theme: "dark" }, play: notSetPlay };

const withDeltaArgs = {
  label: "Savings",
  value: 12400,
  deltaText: undefined,
  delta: { direction: "up" as const, text: "+£240 this month" },
  subtext: undefined,
};

const withDeltaPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("+£240 this month")).toBeInTheDocument();
  await expect(canvas.getByText("Up")).toBeInTheDocument();
};

/** One delta badge, on its own row under the value. */
export const WithDelta: Story = {
  args: withDeltaArgs,
  globals: { theme: "light" },
  play: withDeltaPlay,
};

export const WithDeltaDark: Story = {
  args: withDeltaArgs,
  globals: { theme: "dark" },
  play: withDeltaPlay,
};

const pair = css({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "3" });

/** A badge never moves the value: both values sit on the same line (known #15). */
export const BadgeKeepsBaseline: Story = {
  decorators: [],
  render: () => (
    <div className={pair}>
      <KpiCard label="Savings" value={12400} />
      <KpiCard delta={{ direction: "up", text: "+£240" }} label="Pension" value={61300} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const a = canvas.getByText("£12,400").getBoundingClientRect();
    const b = canvas.getByText("£61,300").getBoundingClientRect();
    await expect(Math.abs(a.bottom - b.bottom)).toBeLessThanOrEqual(1);
  },
};

const sideBySide = css({
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "4",
});

/** R2-2: a money value, a date and a plain number render at the one KPI value size. */
const MixedValues = () => (
  <div className={sideBySide}>
    <KpiCard label="Monthly payment" value={305} valueFormat={{ fractionDigits: 0 }} />
    <KpiCard label="Debt-free date" value="December 2029" />
    <KpiCard label="Debts" subtext="Cards and loans" value="3" />
  </div>
);

const mixedValuesPlay: Story["play"] = async ({ canvasElement }) => {
  const values = [...canvasElement.querySelectorAll("[data-kpi-value]")];
  await expect(new Set(values.map((v) => getComputedStyle(v).fontSize)).size).toBe(1);
};

export const MixedValueKinds: Story = {
  render: () => <MixedValues />,
  globals: { theme: "light" },
  play: mixedValuesPlay,
};

export const MixedValueKindsDark: Story = {
  render: () => <MixedValues />,
  globals: { theme: "dark" },
  play: mixedValuesPlay,
};

/** UX extra C: a computed figure explains itself in an InfoTip beside the label. */
export const WithExplain: Story = {
  args: { explain: "Your saved cash divided by what you spend each month." },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^About / }));
    await expect(
      within(document.body).getByText("Your saved cash divided by what you spend each month."),
    ).toBeVisible();
  },
};
export const WithExplainDark: Story = { ...WithExplain, globals: { theme: "dark" } };

/** The explain trigger on the hero tone keeps the hero ink (text.onContrast), not text.muted. */
export const WithExplainHero: Story = {
  ...WithExplain,
  args: { ...WithExplain.args, tone: "hero" },
};
export const WithExplainHeroDark: Story = { ...WithExplainHero, globals: { theme: "dark" } };
