import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { css } from "../../../styled-system/css";
import { ChartLegend } from "../ChartLegend/ChartLegend";
import { ProjectionNotice } from "../ProjectionNotice/ProjectionNotice";
import { ChartFigure } from "./ChartFigure";

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

const legendItems = [
  { id: "networth", label: "Net worth", color: "primary", swatch: "line" },
  { id: "projection", label: "Projection", color: "projection", swatch: "dashed" },
] as const;

const meta: Meta<typeof ChartFigure> = {
  title: "3. Financial Patterns & Sections/ChartFigure",
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
