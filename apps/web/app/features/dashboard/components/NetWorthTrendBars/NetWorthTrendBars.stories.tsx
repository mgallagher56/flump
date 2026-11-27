import { type NetWorthTrend, selectNetWorthTrend } from "@flump/finance-engine";
import { HeroFigure } from "@repo/ui";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";
import { NetWorthTrendBars } from "./NetWorthTrendBars";

const rec = (month: string, netWorth: number) => ({ month, netWorth, allCarried: false });
const carried = (month: string, netWorth: number) => ({ month, netWorth, allCarried: true });

const trendOf = (points: Parameters<typeof selectNetWorthTrend>[0]): NetWorthTrend => {
  const trend = selectNetWorthTrend(points);
  if (!trend) throw new Error("story fixture must draw");
  return trend;
};

/** Eight recorded months: the bars keep the last seven, May to November. */
const SEVEN = trendOf([
  rec("2026-04", 44100),
  rec("2026-05", 45200),
  rec("2026-06", 46900),
  rec("2026-07", 46300),
  rec("2026-08", 48000),
  rec("2026-09", 48800),
  rec("2026-10", 49680),
  rec("2026-11", 52100),
]);

/** A lower month is just a shorter bar: no colour, arrow or word for it. */
const MIXED = trendOf([
  rec("2026-07", -2400),
  rec("2026-08", -900),
  rec("2026-09", 600),
  rec("2026-10", 1800),
  rec("2026-11", 1200),
]);

const NEGATIVE = trendOf([
  rec("2026-08", -18200),
  rec("2026-09", -17100),
  rec("2026-10", -16300),
  rec("2026-11", -15800),
]);

const GAP = trendOf([
  rec("2026-05", 30100),
  rec("2026-06", 30900),
  carried("2026-07", 30900),
  carried("2026-08", 30900),
  rec("2026-09", 32400),
  rec("2026-10", 33000),
  rec("2026-11", 33800),
]);

const meta: Meta<typeof NetWorthTrendBars> = {
  title: "3. Patterns/Dashboard/NetWorthTrendBars",
  component: NetWorthTrendBars,
  parameters: { layout: "padded" },
  args: { trend: SEVEN },
  // Drawn where it lives: beside the figure in the Home hero.
  render: (args) => (
    <HeroFigure
      aside={<NetWorthTrendBars {...args} />}
      label="Net worth"
      value={args.trend.bars.at(-1)?.netWorth ?? 0}
    />
  ),
};

export default meta;
type Story = StoryObj<typeof NetWorthTrendBars>;

const barsIn = (canvasElement: HTMLElement) => [
  ...(canvasElement.querySelector("svg[aria-hidden='true']")?.querySelectorAll("rect") ?? []),
];

// Light and dark render side by side, so queries take the first match.
export const SevenMonths: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bars = barsIn(canvasElement);
    await expect(bars).toHaveLength(7);
    await expect(bars.map((b) => b.dataset.latest)).toEqual([
      "false",
      "false",
      "false",
      "false",
      "false",
      "false",
      "true",
    ]);
    // Only the latest is solid; the others are outlines.
    await expect(bars.filter((b) => b.getAttribute("fill") === "currentColor")).toHaveLength(1);
    await expect(canvas.getAllByText("November 2026, the latest: £52,100")[0]).toBeInTheDocument();
    await expect(canvas.queryAllByText("April 2026: £44,100")).toHaveLength(0);
    // Beside the figure on a wide card.
    const plot = canvasElement.querySelector("svg[aria-hidden='true']") as SVGElement;
    const figure = canvas.getAllByText("£52,100")[0] as HTMLElement;
    await expect(plot.getBoundingClientRect().top).toBeLessThan(
      figure.getBoundingClientRect().bottom,
    );
  },
};

export const NegativeAndPositive: Story = {
  args: { trend: MIXED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Zero sits 1,800 / 4,200 = 42.86% down: two months hang below it, three rise above it.
    const zero = canvasElement.querySelector("[data-zero-line]");
    await expect(zero?.getAttribute("y1")).toBe("42.86");
    await expect(canvas.getAllByText("July 2026: minus £2,400")[0]).toBeInTheDocument();
    await expect(canvas.getAllByText("November 2026, the latest: £1,200")[0]).toBeInTheDocument();
  },
};

export const AllNegative: Story = {
  args: { trend: NEGATIVE },
  play: async ({ canvasElement }) => {
    // Every month hangs from a zero line at the top.
    await expect(canvasElement.querySelector("[data-zero-line]")?.getAttribute("y1")).toBe("0");
    await expect(barsIn(canvasElement).map((b) => b.getAttribute("y"))).toEqual([
      "0",
      "0",
      "0",
      "0",
    ]);
  },
};

export const GapMonth: Story = {
  args: { trend: GAP },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(barsIn(canvasElement)).toHaveLength(5);
    await expect(
      canvas.getAllByText("No check-ins from July 2026 to August 2026")[0],
    ).toBeInTheDocument();
  },
};

/** At 375px the bars go under the figure, never squeezed beside it. */
export const Phone: Story = {
  parameters: { viewport: { defaultViewport: "mobile2" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const plot = canvasElement.querySelector("svg[aria-hidden='true']") as SVGElement;
    const figure = canvas.getAllByText("£52,100")[0] as HTMLElement;
    await expect(plot.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      figure.getBoundingClientRect().bottom,
    );
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

/**
 * Three close months, the figures from the phone check of 27 November 2026: on the honest scale
 * the bars are nearly the same height, and the latest is still drawn solid.
 */
export const ThreeCloseMonths: Story = {
  args: {
    trend: trendOf([rec("2026-09", 230281), rec("2026-10", 231140), rec("2026-11", 232000)]),
  },
  parameters: { viewport: { defaultViewport: "mobile2" } },
  play: async ({ canvasElement }) => {
    const rects = [...canvasElement.querySelectorAll("svg[aria-hidden='true'] rect")];
    await expect(rects).toHaveLength(3);
    const latest = rects.at(-1) as SVGRectElement;
    await expect(latest.getAttribute("data-latest")).toBe("true");
    await expect(getComputedStyle(latest).fill).not.toBe("none");
    for (const earlier of rects.slice(0, -1)) {
      await expect(getComputedStyle(earlier).fill).toBe("none");
    }
  },
};

export const ThreeCloseMonthsDark: Story = { ...ThreeCloseMonths, globals: { theme: "dark" } };
