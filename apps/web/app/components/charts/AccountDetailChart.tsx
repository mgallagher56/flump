import {
  CHART_AXIS_DEFAULTS,
  ChartFigure,
  formatMonthTick,
  niceStep,
  niceYDomain,
  pickTicks,
} from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { curveCardinal } from "d3-shape";
import { type FC, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccountDetail } from "~/containers/accounts/types";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";

interface AccountDetailChartProps {
  accountDetails: AccountDetail[];
  showAxes?: boolean;
  /** Accessible name for the chart (for example the account name). */
  title?: string;
}

// Keep the figure filling its parent like the bare chart did.
const figureFill = css({
  height: "100%",
  gap: "0",
  "& > div[aria-hidden]": { flex: "1", minHeight: "0" },
});

const curve = curveCardinal.tension(0.1);

const AccountDetailChart: FC<AccountDetailChartProps> = ({
  accountDetails,
  showAxes = false,
  title = "Account balance history",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const reducedMotion = usePrefersReducedMotion();
  const formattedAccountDetails = useMemo(
    () =>
      accountDetails.map((accountDetail) => ({
        // "2026-05": read by formatMonthTick, so the axis says "May" and the table "May 2026".
        Name: `${accountDetail.year}-${String(accountDetail.month).padStart(2, "0")}`,
        Value: accountDetail.value,
      })),
    [accountDetails],
  );

  // Near the data, not from £0, so a steady balance does not draw as a flat line (R2-2).
  const yDomain = useMemo(
    () => niceYDomain(formattedAccountDetails.map((d) => d.Value)),
    [formattedAccountDetails],
  );
  // Evenly spaced round ticks across the domain, so the axis never reads £2k, £2.4k, £2.7k.
  const yTicks = useMemo(() => {
    const [lo, hi] = yDomain;
    const step = niceStep((hi - lo) / CHART_AXIS_DEFAULTS.yTickCount);
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
    return ticks;
  }, [yDomain]);
  const xTicks = useMemo(
    () =>
      pickTicks(
        formattedAccountDetails.map((d) => d.Name),
        CHART_AXIS_DEFAULTS.maxXTicks,
      ),
    [formattedAccountDetails],
  );
  const compact = useMemo(
    () =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        // Whole pounds: a compact "£38.1k" hides the round step the ticks are on.
        maximumFractionDigits: 0,
      }),
    [],
  );
  const monthLabel = (key: string) => formatMonthTick(key, "numeric");
  const first = formattedAccountDetails[0];
  const last = formattedAccountDetails[formattedAccountDetails.length - 1];
  const summary = last
    ? `Balance history from ${monthLabel(first.Name)} to ${monthLabel(last.Name)}: ${formatCurrency(first.Value)} at the start and ${formatCurrency(last.Value)} at the end, across ${formattedAccountDetails.length} monthly balances.`
    : "No balance history recorded yet.";

  return (
    <ChartFigure
      className={figureFill}
      dataTable={
        showAxes && last ? (
          <table>
            <caption>{title} by month</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Balance</th>
              </tr>
            </thead>
            <tbody>
              {formattedAccountDetails.map((row) => (
                <tr key={row.Name}>
                  <th scope="row">{monthLabel(row.Name)}</th>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(row.Value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : undefined
      }
      summary={summary}
      // A compact tile chart: the summary stays screen-reader only (ChartFigure now shows it by default).
      showSummary={false}
      hideTitle
      title={title}
    >
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart
          data={formattedAccountDetails}
          margin={
            showAxes
              ? { top: 10, right: CHART_AXIS_DEFAULTS.plotPaddingRight, left: 0, bottom: 5 }
              : { top: 0, right: 0, left: 0, bottom: 0 }
          }
        >
          <defs>
            <linearGradient id="colorValue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--colors-primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--colors-primary)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          {showAxes && (
            <CartesianGrid strokeDasharray="3 3" stroke="var(--colors-border)" vertical={false} />
          )}
          {showAxes ? (
            <XAxis
              axisLine={false}
              dataKey="Name"
              fontSize={11}
              interval={0}
              ticks={xTicks}
              stroke="var(--colors-text-muted)"
              tickFormatter={(value: string) => formatMonthTick(value, "none")}
              tickLine={false}
              tickMargin={8}
            />
          ) : (
            <XAxis dataKey="Name" height={0} tick={false} />
          )}
          {showAxes ? (
            <YAxis
              axisLine={false}
              fontSize={11}
              stroke="var(--colors-text-muted)"
              domain={yDomain}
              ticks={yTicks}
              tickFormatter={(value: number) => compact.format(value)}
              tickLine={false}
              tickMargin={8}
            />
          ) : (
            <YAxis domain={yDomain} tick={false} width={0} />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--colors-card)",
              borderColor: "var(--colors-border)",
              borderRadius: "8px",
            }}
            formatter={(value: any) => [formatCurrency(value), "Balance"]}
            labelFormatter={(label) => monthLabel(String(label))}
            itemStyle={{
              color: "var(--colors-text-primary)",
            }}
            labelStyle={{
              color: "var(--colors-text-muted)",
              fontWeight: "bold",
            }}
          />
          <Area
            dataKey="Value"
            dot={false}
            fill="url(#colorValue)"
            stroke="var(--colors-primary)"
            strokeWidth={1.5}
            type={curve}
            isAnimationActive={!reducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
};

export default AccountDetailChart;
