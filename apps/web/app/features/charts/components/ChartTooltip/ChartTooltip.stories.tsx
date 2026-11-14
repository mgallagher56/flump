import { ChartFigure, ChartLegend, ProjectionNotice, useChartAnimation } from "@repo/ui";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { expect, userEvent, within } from "storybook/test";
import {
  chartBandProps,
  chartCursorProps,
  chartGridProps,
  chartLineProps,
  chartXAxisProps,
  chartYAxisProps,
} from "../../utils/chartProps";
import { ChartTooltip } from "./ChartTooltip";
import { chartKitDemoFrame } from "./ChartTooltip.styles";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ACTUAL = [21400, 23100, 24800, 27200, 29900, 31500, 34800, 38200, 41100, 44600, 46900, 48250];
const PROJECTION_FROM = 9;

const data = MONTHS.map((month, i) => ({
  month,
  netWorth: i <= PROJECTION_FROM ? ACTUAL[i] : null,
  projection: i >= PROJECTION_FROM ? (ACTUAL[i] ?? null) : null,
}));

const LEGEND = [
  { id: "networth", label: "Net worth", color: "primary", swatch: "line" },
  { id: "projection", label: "Projection", color: "projection", swatch: "dashed" },
] as const;

const NetWorthChart = ({ dragging = false }: { dragging?: boolean }) => {
  const animate = useChartAnimation({ dragging });
  return (
    <div className={chartKitDemoFrame}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="month" {...chartXAxisProps} />
          <YAxis {...chartYAxisProps} />
          <ReferenceArea x1="Oct" x2="Dec" {...chartBandProps} />
          <Tooltip
            content={<ChartTooltip hiddenKeys={[]} />}
            cursor={chartCursorProps}
            isAnimationActive={false}
          />
          <Line dataKey="netWorth" name="Net worth" {...chartLineProps("primary", { animate })} />
          <Line
            dataKey="projection"
            name="Projection"
            {...chartLineProps("projection", { projection: true, animate })}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const Demo = ({ sample = false }: { sample?: boolean }) => {
  const [dragging, setDragging] = useState(false);
  return (
    <>
      <ChartFigure
        dataTable={
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
                <th scope="row">Dec 2026</th>
                <td>£48,250</td>
              </tr>
            </tbody>
          </table>
        }
        legend={<ChartLegend items={LEGEND} />}
        notice={
          sample ? (
            <ProjectionNotice>
              This is sample data. Connect an account to see your own figures.
            </ProjectionNotice>
          ) : undefined
        }
        showSummary
        summary="Net worth rises from £21,400 in January to £48,250 in December. The last three months are a projection."
        title="Your net worth over the past year"
      >
        <NetWorthChart dragging={dragging} />
      </ChartFigure>
      <label>
        <input checked={dragging} onChange={(e) => setDragging(e.target.checked)} type="checkbox" />{" "}
        Simulate dragging (animation off)
      </label>
    </>
  );
};

const meta: Meta<typeof Demo> = {
  title: "4. Charts/Chart kit (recharts adapters)",
  component: Demo,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Demo>;

export const NetWorthWithProjection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("figure", { name: "Your net worth over the past year" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("list", { name: "Chart key" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Show data" }));
    await expect(canvas.getByRole("table")).toBeInTheDocument();
  },
};

export const SampleData: Story = { args: { sample: true } };

export const Dark: Story = { ...NetWorthWithProjection, globals: { theme: "dark" } };
