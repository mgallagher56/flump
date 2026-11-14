import type { AvalancheVsSnowballComparison, PayoffResult } from "@flump/finance-engine";
import {
  Button,
  ChartFigure,
  ChartLegend,
  chartColor,
  formatMonthTick,
  SimulatorSplitLayout,
  SliderField,
  Table,
  Tabs,
  TBody,
  Td,
  THead,
  Th,
  useChartFigure,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartCursorProps,
  chartGridProps,
  chartLineProps,
  chartXAxisProps,
  chartYAxisProps,
} from "~/features/charts/utils/chartProps";
import { monthTicks, yAxisScale } from "~/features/debt/utils/chartAxis";
import { formatPayoffDuration } from "~/features/debt/utils/payoffFormat";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  chartLabel,
  chartWrap,
  contentStack,
  controlsStack,
  dataCell,
  leftOverRow,
  mutedNote,
  noteLink,
  orderHint,
  outcome,
  outcomePrompt,
  outcomeSupport,
  outcomeSupportItem,
  outcomeValue,
} from "./PayExtraTool.styles";

export type PayoffOrder = "avalanche" | "snowball";

export interface PayExtraToolProps {
  /** Payoff results at the scenario's extra payment (minimum-only included). */
  comparison: AvalancheVsSnowballComparison;
  extraPayment: number;
  onChangeExtraPayment: (amount: number) => void;
  selectedStrategy: PayoffOrder;
  onSelectStrategy: (strategy: PayoffOrder) => void;
  /** What the budget leaves over each month, or null when there is no budget with income. */
  budgetLeftOver: number | null;
  /** Total balance of the debts in the payoff plan today: the chart's first point. */
  startBalance: number;
}

/** R1: both orders carry the same fields and the same verbs. */
const ORDERS: { value: PayoffOrder; label: string; hint: string }[] = [
  {
    value: "snowball",
    label: "Smallest balance first",
    hint: "Pays the debt with the smallest balance first.",
  },
  {
    value: "avalanche",
    label: "Highest rate first",
    hint: "Pays the debt with the highest APR first.",
  },
];

/** Slider ceiling: at least £1,000, and never below what is left over or the current amount. */
const sliderMax = (leftOver: number, extraPayment: number): number =>
  Math.max(1000, Math.ceil(leftOver / 10) * 10, Math.ceil(extraPayment / 10) * 10);

/** Longest chart run, so a never-paid-off minimum line does not squash the scenario line. */
const MAX_CHART_MONTHS = 360;

/**
 * "Sep 2029" for the month `offset` months from now. Built from a "YYYY-MM" key so the month never
 * shifts with the time zone, and through `formatMonthTick`, which never writes "Sept". Ticks, the
 * tooltip and the data table all use it. (The web app does not depend on `@flump/format`.)
 */
export const monthLabel = (offset: number, now: Date = new Date()): string => {
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return formatMonthTick(key);
};

/** The calendar year of the month `offset` months from now, as "2029". */
const yearLabel = (offset: number, now: Date = new Date()): string =>
  String(new Date(now.getFullYear(), now.getMonth() + offset, 1).getFullYear());

const achievable = (result: PayoffResult): boolean => result.payoffAchievable !== false;

interface ChartRow {
  month: number;
  scenario: number;
  minimum: number | null;
}

const balanceAt = (result: PayoffResult, month: number): number | null => {
  const row = result.monthlySchedule.find((m) => m.month === month);
  if (row) return Math.max(0, row.totalBalance);
  return achievable(result) && month > result.months ? 0 : null;
};

interface PayoffChartProps {
  rows: ChartRow[];
  showBaseline: boolean;
  /** Month the selected plan pays off, or null when it never does. */
  paidOffMonth: number | null;
}

/**
 * The payoff chart, drawn inside `ChartFigure` so it reads the figure's conventions (R2-2, R2-7):
 * evenly spaced ticks (years only over two years, fewer on a narrow plot), a y domain from
 * `niceYDomain`, and a "Paid off" marker once there is a change. Lines carry no direct labels:
 * one line is named by the figure title, two by the figure's legend.
 */
const PayoffChart: FC<PayoffChartProps> = ({ rows, showBaseline, paidOffMonth }) => {
  const { formatCurrency } = useFormatCurrency();
  const { maxTicks, plotPaddingRight } = useChartFigure();
  // Measured so a narrow plot keeps to a few ticks (0 until measured: treated as wide).
  const [width, setWidth] = useState(0);
  const lastMonth = rows.at(-1)?.month ?? 0;
  const { ticks, yearsOnly } = useMemo(
    () => monthTicks(lastMonth, width, maxTicks),
    [lastMonth, width, maxTicks],
  );
  // A little headroom over the balance, not a jump to the next round step.
  // Round, evenly spaced ticks (£0, £2.5k, £5k...), the top one within a step of the largest.
  const yScale = useMemo(
    () => yAxisScale(rows.flatMap((r) => (showBaseline ? [r.scenario, r.minimum] : [r.scenario]))),
    [rows, showBaseline],
  );
  const renderTick = ({
    x,
    y,
    payload,
  }: {
    x?: number | string;
    y?: number | string;
    payload?: { value?: number | string };
  }) => {
    const value = Number(payload?.value);
    return (
      <text
        dy="0.71em"
        fill={chartXAxisProps.tick.fill}
        fontSize={chartXAxisProps.tick.fontSize}
        textAnchor={value === lastMonth ? "end" : "middle"}
        x={x}
        y={y}
      >
        {yearsOnly ? yearLabel(value) : monthLabel(value)}
      </text>
    );
  };

  const scenarioName = showBaseline ? "With the extra payment" : "Debt remaining";

  return (
    <div className={chartWrap}>
      <ResponsiveContainer height="100%" width="100%" onResize={(w) => setWidth(w)}>
        <LineChart data={rows} margin={{ top: 24, right: plotPaddingRight, left: 0, bottom: 0 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            {...chartXAxisProps}
            dataKey="month"
            interval={0}
            tick={renderTick}
            ticks={ticks}
          />
          <YAxis {...chartYAxisProps} domain={yScale.domain} interval={0} ticks={yScale.ticks} />
          <Tooltip
            cursor={chartCursorProps}
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(m) => monthLabel(Number(m))}
          />
          {showBaseline ? (
            <Line
              {...chartLineProps("baseline", { projection: true })}
              connectNulls={false}
              dataKey="minimum"
              name="Minimum payments only"
            />
          ) : null}
          <Line {...chartLineProps("debt")} dataKey="scenario" name={scenarioName} />
          {/* At £0 extra the KPI already gives the date, so the marker shows only with a change. */}
          {showBaseline && paidOffMonth !== null ? (
            <ReferenceLine
              label={{
                value: "Paid off",
                position: "insideTopRight",
                className: chartLabel,
                fill: chartColor("debt"),
              }}
              stroke={chartColor("grid")}
              strokeDasharray="4 4"
              x={paidOffMonth}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * The scenario zone's one tool, "Pay extra each month" (E16 PR 6): one slider, one payoff-order
 * `Tabs` above one result block: the change as the outcome (a prompt at £0, since the debt-free
 * date is already in the KPI strip), at most one supporting figure and one chart with one "Paid
 * off" marker. It reads and writes scenario state only, never saved data.
 */
export const PayExtraTool: FC<PayExtraToolProps> = ({
  comparison,
  extraPayment,
  onChangeExtraPayment,
  selectedStrategy,
  onSelectStrategy,
  budgetLeftOver,
  startBalance,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const leftOver = Math.max(0, budgetLeftOver ?? 0);
  const max = sliderMax(leftOver, extraPayment);
  const useTarget = Math.min(Math.round(leftOver), max);

  const active = selectedStrategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const baseline = comparison.minimumOnly;
  const activeOrder = ORDERS.find((o) => o.value === selectedStrategy) ?? ORDERS[0];
  const paidOff = achievable(active);
  // Both orders can end the same way (one debt, or debts that clear in the same months).
  const sameResult =
    comparison.avalanche.months === comparison.snowball.months &&
    Math.round(comparison.avalanche.totalInterest) ===
      Math.round(comparison.snowball.totalInterest) &&
    achievable(comparison.avalanche) === achievable(comparison.snowball);
  const monthsSooner = achievable(baseline) ? Math.max(0, baseline.months - active.months) : 0;
  const interestLess = Math.max(0, baseline.totalInterest - active.totalInterest);
  const showBaseline = extraPayment > 0;

  // At £0 there is no change to state: the debt-free date is in the KPI strip above, so the zone
  // shows a prompt instead of repeating it. Above £0 the outcome is only the change.
  const outcomeText = !paidOff
    ? "Not paid off in this estimate"
    : !achievable(baseline)
      ? `Paid off in ${formatPayoffDuration(active.months)}`
      : monthsSooner > 0
        ? `Debt-free ${formatPayoffDuration(monthsSooner)} sooner`
        : "The same debt-free date";

  const rows = useMemo<ChartRow[]>(() => {
    const lastScenario = paidOff ? active.months : active.monthlySchedule.length;
    const lastBaseline = showBaseline
      ? achievable(baseline)
        ? baseline.months
        : baseline.monthlySchedule.length
      : 0;
    const length = Math.min(MAX_CHART_MONTHS, Math.max(lastScenario, lastBaseline));
    const start = Math.max(0, startBalance);
    const out: ChartRow[] = [{ month: 0, scenario: Math.round(start), minimum: Math.round(start) }];
    for (let month = 1; month <= length; month += 1) {
      const minimum = balanceAt(baseline, month);
      out.push({
        month,
        scenario: Math.round(balanceAt(active, month) ?? 0),
        minimum: minimum === null ? null : Math.round(minimum),
      });
    }
    return out;
  }, [active, baseline, paidOff, showBaseline, startBalance]);

  const yearRows = rows.filter((r) => r.month % 12 === 0 || r.month === rows.length - 1);

  const summary = paidOff
    ? `Illustration: paid off in ${formatPayoffDuration(active.months)}, ${formatCurrency(
        active.totalInterest,
      )} interest, paying the ${activeOrder.label.toLowerCase()}.`
    : "Illustration: at these payments your debts are not paid off.";

  const controls = (
    <div className={controlsStack}>
      <SliderField
        format="currency"
        helperText="On top of your minimum payments."
        label="Extra payment each month"
        max={max}
        min={0}
        step={10}
        value={extraPayment}
        onChange={onChangeExtraPayment}
      />
      {budgetLeftOver === null ? (
        <p className={mutedNote}>
          <Link className={noteLink} to="/app/budget">
            Set up your budget to see what you have left over each month
          </Link>
        </p>
      ) : leftOver > 0 && extraPayment !== useTarget ? (
        // The button alone names the amount, so it is said once; once used, it hides.
        <div className={leftOverRow}>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => onChangeExtraPayment(useTarget)}
          >
            Use the {formatCurrency(leftOver)} left over
          </Button>
        </div>
      ) : null}
    </div>
  );

  const content = (
    <div className={contentStack}>
      <Tabs
        aria-label="Payoff order"
        items={ORDERS.map(({ value, label }) => ({ value, label }))}
        size="sm"
        value={selectedStrategy}
        onValueChange={(value) => onSelectStrategy(value as PayoffOrder)}
      />
      <p className={orderHint}>
        {sameResult ? "Both orders give the same result for your debts." : activeOrder.hint}
      </p>

      <div className={outcome} data-testid="scenario-outcome" id="scenario-outcome">
        {showBaseline ? (
          <>
            <p className={outcomeValue}>{outcomeText}</p>
            {paidOff ? (
              <dl className={outcomeSupport}>
                <div className={outcomeSupportItem}>
                  <dt>Interest compared with minimum payments only</dt>
                  <dd>{interestLess > 0 ? `${formatCurrency(interestLess)} less` : "No change"}</dd>
                </div>
              </dl>
            ) : null}
          </>
        ) : (
          <p className={outcomePrompt}>Move the slider to see what changes</p>
        )}
      </div>

      <ChartFigure
        dataTable={
          <Table caption="Debt remaining by year">
            <THead>
              <tr>
                <Th>Month</Th>
                <Th numeric>{showBaseline ? "With the extra payment" : "Debt remaining"}</Th>
                {showBaseline ? <Th numeric>Minimum payments only</Th> : null}
              </tr>
            </THead>
            <TBody>
              {yearRows.map((row) => (
                <tr key={row.month}>
                  <Td>{monthLabel(row.month)}</Td>
                  <Td className={dataCell} numeric>
                    {formatCurrency(row.scenario)}
                  </Td>
                  {showBaseline ? (
                    <Td className={dataCell} numeric>
                      {row.minimum === null ? "Not paid off" : formatCurrency(row.minimum)}
                    </Td>
                  ) : null}
                </tr>
              ))}
            </TBody>
          </Table>
        }
        // One line is named by the title; two are named by the legend, never by labels on the plot.
        directLabels={false}
        hideTitle
        legend={
          showBaseline ? (
            <ChartLegend
              items={[
                { id: "scenario", label: "With the extra payment", color: "debt" },
                {
                  id: "minimum",
                  label: "Minimum payments only",
                  color: "baseline",
                  swatch: "dashed",
                },
              ]}
            />
          ) : undefined
        }
        pointCount={rows.length}
        // The outcome above states the change (and at £0 the KPI has the date), so the summary
        // never repeats it on screen and stays for screen readers.
        showSummary={false}
        summary={summary}
        title="How your debt comes down"
      >
        <PayoffChart
          paidOffMonth={paidOff ? active.months : null}
          rows={rows}
          showBaseline={showBaseline}
        />
      </ChartFigure>
    </div>
  );

  return (
    <SimulatorSplitLayout
      content={content}
      contentLabel="Your result"
      controls={controls}
      controlsLabel="Pay extra each month"
      controlsSpan={5}
    />
  );
};

export default PayExtraTool;
