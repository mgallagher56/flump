import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { formatMonthTick, niceYDomain, xTickAnchor } from "../../charts/axisDefaults";
import { formatAxisCurrency } from "../../charts/formatAxisCurrency";
import { ChartLegend } from "../ChartLegend/ChartLegend";
import { ProjectionNotice } from "../ProjectionNotice/ProjectionNotice";
import { ChartFigure, pickTicks, useChartFigure } from "./ChartFigure";

const grid = css({ stroke: "chart.grid", strokeWidth: "1" });
const axisText = css({ fill: "text.muted", fontSize: "12px", fontVariantNumeric: "tabular-nums" });
const band = css({ fill: "chart.band" });
const lineBase = {
  fill: "none",
  strokeWidth: "3",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const actual = css({ ...lineBase, stroke: "chart.primary" });
const projected = css({ ...lineBase, stroke: "chart.projection", strokeDasharray: "6 6" });
const svgClass = css({ width: "100%", height: "auto", display: "block" });

const TICKS = [
  { y: 20, label: "£50k" },
  { y: 70, label: "£25k" },
  { y: 120, label: "£0" },
];

/** Static SVG stand-in for a chart: ui stories never import recharts. */
const StaticChart = () => (
  <svg
    aria-hidden="true"
    className={svgClass}
    focusable="false"
    role="presentation"
    viewBox="0 0 600 160"
  >
    {TICKS.map((t) => (
      <g key={t.y}>
        <line className={grid} x1="48" x2="592" y1={t.y} y2={t.y} />
        <text className={axisText} textAnchor="end" x="40" y={t.y + 4}>
          {t.label}
        </text>
      </g>
    ))}
    <rect className={band} height="100" width="170" x="422" y="20" />
    <polyline className={actual} points="48,104 120,98 200,92 280,78 360,64 422,52" />
    <polyline className={projected} points="422,52 480,44 540,36 592,30" />
    {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((m, i) => (
      <text className={axisText} key={m} textAnchor="middle" x={60 + i * 100} y="150">
        {m}
      </text>
    ))}
  </svg>
);

const tickText = css({ fill: "text.muted", fontSize: "xs", fontVariantNumeric: "tabular-nums" });
const labelText = css({
  fill: "text.primary",
  fontSize: "xs",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
});
const second = css({ ...lineBase, stroke: "chart.series2" });
const marker = css({ fill: "chart.primary", stroke: "surface.card", strokeWidth: "2" });
const baseline = css({ stroke: "chart.baseline", strokeWidth: "1", strokeDasharray: "4 4" });

/** 37 months of a pension pot well away from zero, from Sep 2026 to Sep 2029. */
const MONTHS = Array.from({ length: 37 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 8 + i, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
});
const POT = MONTHS.map((_, i) => 182_000 + i * 1_500 + Math.round(Math.sin(i / 3) * 2_000));
const CONTRIBUTIONS = MONTHS.map((_, i) => 176_000 + i * 1_100);

const W = 600;
const H = 200;
const LEFT = 56;
const TOP = 16;
const BOTTOM = 32;

/**
 * Static stand-in for an app chart (ui stories never import recharts) that reads the figure's
 * conventions the way a real chart does: at most `maxTicks` x ticks with the last one anchored to
 * the plot edge, "Sep" month ticks, a y domain near the data, direct labels offset from the line
 * end, and the one annotation.
 */
const ConventionChart = () => {
  const { directLabels, annotation, maxTicks, labelOffset, plotPaddingRight } = useChartFigure();
  const right = W - plotPaddingRight - (directLabels ? 72 : 0);
  const [lo, hi] = niceYDomain([...POT, ...CONTRIBUTIONS]);
  const x = (i: number) => LEFT + (i / (MONTHS.length - 1)) * (right - LEFT);
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo)) * (H - TOP - BOTTOM);
  const path = (values: readonly number[]) => values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const ticks = pickTicks(
    MONTHS.map((_, i) => i),
    maxTicks,
  );
  const yTicks = [lo, (lo + hi) / 2, hi];
  const annotated = annotation ? MONTHS.indexOf(String(annotation.x)) : -1;
  const ends = [
    { name: "Pot", values: POT },
    { name: "Paid in", values: CONTRIBUTIONS },
  ];
  return (
    <svg
      aria-hidden="true"
      className={svgClass}
      focusable="false"
      role="presentation"
      viewBox={`0 0 ${W} ${H}`}
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line className={grid} x1={LEFT} x2={right} y1={y(t)} y2={y(t)} />
          <text className={tickText} textAnchor="end" x={LEFT - 8} y={y(t) + 4}>
            {formatAxisCurrency(t)}
          </text>
        </g>
      ))}
      <polyline className={actual} points={path(POT)} />
      <polyline className={second} points={path(CONTRIBUTIONS)} />
      {ticks.map((i, n) => (
        <text
          className={tickText}
          key={MONTHS[i]}
          textAnchor={xTickAnchor(n, ticks.length)}
          x={x(i)}
          y={H - 10}
        >
          {formatMonthTick(MONTHS[i] as string, "2-digit")}
        </text>
      ))}
      {directLabels
        ? ends.map((s) => (
            <text
              className={labelText}
              dx={labelOffset.dx}
              dy={labelOffset.dy}
              key={s.name}
              x={x(s.values.length - 1)}
              y={y(s.values.at(-1) as number)}
            >
              {s.name}
            </text>
          ))
        : null}
      {annotation && annotated >= 0 ? (
        <g>
          <line className={baseline} x1={x(annotated)} x2={x(annotated)} y1={TOP} y2={H - BOTTOM} />
          <circle className={marker} cx={x(annotated)} cy={y(POT[annotated] as number)} r="4" />
          <text
            className={labelText}
            dx={-labelOffset.dx}
            dy={labelOffset.dy}
            textAnchor="end"
            x={x(annotated)}
            y={y(POT[annotated] as number)}
          >
            {annotation.label}
          </text>
        </g>
      ) : null}
    </svg>
  );
};

const legendItems = [
  { id: "networth", label: "Net worth", color: "primary", swatch: "line" },
  { id: "projection", label: "Projection", color: "projection", swatch: "dashed" },
] as const;

const meta: Meta<typeof ChartFigure> = {
  title: "4. Charts/ChartFigure",
  component: ChartFigure,
  parameters: { layout: "padded" },
  args: {
    title: "Your net worth over the past year",
    summary:
      "Net worth rises from £21,400 in January to £48,250 in November. The last three months are a projection.",
    showSummary: true,
    children: <StaticChart />,
    legend: <ChartLegend items={legendItems} />,
    dataTable: (
      <table>
        <caption>Net worth by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Net worth</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Jan 2026</th>
            <td>£21,400</td>
          </tr>
          <tr>
            <th scope="row">Nov 2026</th>
            <td>£48,250</td>
          </tr>
        </tbody>
      </table>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof ChartFigure>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("figure", { name: "Your net worth over the past year" }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/£48,250 in November/)).toBeInTheDocument();
    // The legend is readable by assistive tech even though the chart is hidden.
    await expect(canvas.getByRole("list", { name: "Chart key" })).toBeInTheDocument();
    await expect(canvas.getByText("Projection")).toBeInTheDocument();
    await expect(canvas.queryByRole("table")).toBeNull();
    const toggle = canvas.getByRole("button", { name: "Show data" });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByRole("table")).toBeInTheDocument();
    await userEvent.click(toggle);
    await expect(canvas.queryByRole("table")).toBeNull();
  },
};

export const SampleDataNotice: Story = {
  args: {
    title: "Your net worth over the past year (sample data)",
    notice: (
      <ProjectionNotice>
        This is sample data. Connect an account to see your own figures.
      </ProjectionNotice>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/This is sample data/)).toBeInTheDocument();
  },
};

export const HiddenSummary: Story = {
  args: { showSummary: false },
};

export const HiddenTitle: Story = {
  args: { hideTitle: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("figure", { name: "Your net worth over the past year" }),
    ).toBeInTheDocument();
  },
};

export const NoLegendNoData: Story = {
  args: { legend: undefined, dataTable: undefined },
};

/** P10.6: with fewer than 3 points no chart is drawn; the summary shows with a one-line prompt. */
export const TooFewPoints: Story = {
  args: {
    title: "Your net worth since you joined",
    summary: "Net worth is £21,400, from your first check-in in January.",
    showSummary: false,
    pointCount: 2,
    notEnoughDataText: "The chart appears after your third check-in.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/appears after your third check-in/)).toBeInTheDocument();
    await expect(canvas.getByText(/Net worth is £21,400/)).toBeVisible();
    await expect(canvas.queryByRole("list", { name: "Chart key" })).toBeNull();
  },
};

export const TooFewPointsDark: Story = { ...TooFewPoints, globals: { theme: "dark" } };

export const Dark: Story = { ...Default, globals: { theme: "dark" } };

/**
 * R2-2 defaults: two series named by direct labels (no legend), one annotation, at most 6 month
 * ticks with "Sep" and the last tick inside the plot, and a y axis near the data instead of £0.
 */
const conventionArgs = {
  title: "Your pension pot",
  summary: "Your pot grows from £182,000 in Sep 2026 to about £236,000 in Sep 2029.",
  legend: undefined,
  dataTable: undefined,
  annotation: { x: "2028-09", label: "About £220,000, Sep 2028" },
  children: <ConventionChart />,
};

const conventionPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.queryByRole("list", { name: "Chart key" })).toBeNull();
  const svgText = [...canvasElement.querySelectorAll("svg text")].map((t) => t.textContent);
  await expect(svgText).toContain("Pot");
  await expect(svgText).toContain("Paid in");
  await expect(svgText).toContain("About £220,000, Sep 2028");
  await expect(svgText.some((t) => t?.includes("Sept"))).toBe(false);
  await expect(svgText).not.toContain("£0");
};

export const DirectLabelsAndAnnotation: Story = {
  args: conventionArgs,
  globals: { theme: "light" },
  play: conventionPlay,
};

export const DirectLabelsAndAnnotationDark: Story = {
  args: conventionArgs,
  globals: { theme: "dark" },
  play: conventionPlay,
};

/** The y axis sits near the data (£160k to £260k here) rather than starting at £0. */
export const AwayFromZero: Story = {
  args: { ...conventionArgs, annotation: undefined },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const svgText = [...canvasElement.querySelectorAll("svg text")].map((t) => t.textContent);
    await expect(svgText).not.toContain("£0");
  },
};

export const AwayFromZeroDark: Story = { ...AwayFromZero, globals: { theme: "dark" } };

/** Asked-for legend: passing `legend` turns direct labels off unless `directLabels` is set. */
export const WithLegendInstead: Story = {
  args: {
    ...conventionArgs,
    annotation: undefined,
    legend: (
      <ChartLegend
        items={[
          { id: "pot", label: "Pot", color: "primary", swatch: "line" },
          { id: "paid", label: "Paid in", color: "series2", swatch: "line" },
        ]}
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("list", { name: "Chart key" })).toBeInTheDocument();
  },
};
