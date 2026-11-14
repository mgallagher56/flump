import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { Button } from "../../primitives/Button/Button";
import { KpiCard } from "../../primitives/KpiCard/KpiCard";
import { KpiStrip } from "./KpiStrip";

const phoneWidth = css({ width: "100%", maxWidth: "343px" });

const meta: Meta<typeof KpiStrip> = {
  title: "3. Patterns/KpiStrip",
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
      delta={{ direction: "down", text: "-£240 a month", polarity: "liability" }}
      label="Monthly payments"
      subtext="Minimum payments on all your debts"
      value="£315"
    />
    <KpiCard label="Debt-free date" subtext="Paying the highest rate first" value="Aug 2026" />
    <KpiCard label="Interest saved" subtext="Compared with minimum payments" value="£2,140" />
    <KpiCard label="Credit cards and overdraft" subtext="Your highest-rate debts" value="£4,200" />
  </KpiStrip>
);

const fourPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByText("Monthly payments")).toBeInTheDocument();
  await expect(canvas.getByText("Debt-free date")).toBeInTheDocument();
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

/** Three cards is the default (E16 P1.5): no `columns` prop needed. */
export const ThreeColumns: Story = {
  render: () => (
    <KpiStrip>
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

const ItemsTupleStrip = () => (
  <KpiStrip
    items={[
      <KpiCard key="nw" label="Net worth" value={184250} />,
      <KpiCard
        delta={{ direction: "down", text: "-£1,240 this month", polarity: "liability" }}
        key="mortgage"
        label="Mortgage balance"
        value={182450}
      />,
      <KpiCard key="cash" label="Cash" value={12400} valueFormat={{ compact: true }} />,
      <KpiCard
        emptyAction={<Button size="sm">Add</Button>}
        key="pension"
        label="Pension"
        value={null}
      />,
    ]}
  />
);

const itemsPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByText("£184,250").length).toBeGreaterThan(0);
  await expect(canvas.getAllByText("Not set").length).toBeGreaterThan(0);
};

export const ItemsTuple: Story = {
  render: () => <ItemsTupleStrip />,
  globals: { theme: "dark" },
  play: itemsPlay,
};

export const ItemsTupleLight: Story = {
  render: () => <ItemsTupleStrip />,
  globals: { theme: "light" },
  play: itemsPlay,
};

const LongValuesStrip = () => (
  <KpiStrip
    items={[
      <KpiCard
        delta={{ direction: "down", text: "-£12,400", polarity: "liability" }}
        key="a"
        label="Net worth"
        value={-1234567}
      />,
      <KpiCard key="b" label="Mortgage balance" value={1234567} />,
      <KpiCard key="c" label="Pension pot" value={-987654} />,
      <KpiCard emptyAction={<Button size="sm">Add</Button>} key="d" label="Cash" value={null} />,
    ]}
  />
);

/** At 375px the strip is a 2x2 grid; no card may overflow horizontally. */
export const PhoneLongValues: Story = {
  render: () => <LongValuesStrip />,
  globals: { theme: "light" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  decorators: [
    (Story) => (
      <div className={phoneWidth}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("minus £1,234,567").length).toBeGreaterThan(0);
    // Skip the 1px visually-hidden spans: their spoken text is clipped, not overflowing.
    const strips = canvasElement.querySelectorAll<HTMLElement>('[data-density="compact"]');
    await expect(strips.length).toBeGreaterThan(0);
    for (const strip of Array.from(strips)) {
      await expect(strip.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
      for (const el of Array.from(strip.querySelectorAll<HTMLElement>("*"))) {
        if (el.getBoundingClientRect().width <= 1) continue;
        await expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);
      }
    }
  },
};

const promptLink = css({ color: "primary", textDecoration: "underline", fontWeight: "medium" });

const MostlyUnsetStrip = () => (
  <KpiStrip
    emptyPrompt={{
      title: "Add your interest rate and term to see your payment breakdown",
      action: (
        <a className={promptLink} href="#details">
          Update your details
        </a>
      ),
    }}
  >
    <KpiCard label="Balance" value={182450} />
    <KpiCard label="Monthly payment" value={null} />
    <KpiCard label="Interest rate" value={null} />
  </KpiStrip>
);

const promptPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    canvas.getByRole("heading", {
      name: "Add your interest rate and term to see your payment breakdown",
    }),
  ).toBeInTheDocument();
  await expect(canvas.getByRole("link", { name: "Update your details" })).toBeInTheDocument();
  await expect(canvas.queryByText("Not set")).toBeNull();
};

/** Half or more cards unset: one prompt naming what is missing replaces the strip (E16 P3.2). */
export const MostlyNotSet: Story = {
  render: () => <MostlyUnsetStrip />,
  globals: { theme: "light" },
  play: promptPlay,
};

export const MostlyNotSetDark: Story = {
  render: () => <MostlyUnsetStrip />,
  globals: { theme: "dark" },
  play: promptPlay,
};
