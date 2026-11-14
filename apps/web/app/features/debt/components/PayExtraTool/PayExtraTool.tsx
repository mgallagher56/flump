import type { AvalancheVsSnowballComparison, PayoffResult } from "@flump/finance-engine";
import {
  Button,
  ChartFigure,
  chartColor,
  pickTicks,
  SimulatorSplitLayout,
  SliderField,
  Table,
  Tabs,
  TBody,
  Td,
  THead,
  Th,
} from "@repo/ui";
import { type FC, useMemo } from "react";
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
  outcomeLabel,
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

const monthLabel = (offset: number): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
};

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

/**
 * The scenario zone's one tool, "Pay extra each month" (E16 PR 6): one slider, one payoff-order
 * `Tabs` above one result block (an outcome, 2 supporting figures and one chart with the payoff
 * month annotated). It reads and writes scenario state only, never saved data.
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
  const monthsSooner = achievable(baseline) ? Math.max(0, baseline.months - active.months) : 0;
  const interestLess = Math.max(0, baseline.totalInterest - active.totalInterest);
  const showBaseline = extraPayment > 0;

  const outcomeText = !paidOff
    ? "Not paid off in this estimate"
    : extraPayment <= 0
      ? `Paid off in ${formatPayoffDuration(active.months)}`
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

  const ticks = useMemo(() => pickTicks(rows.map((r) => r.month)), [rows]);
  const yearRows = rows.filter((r) => r.month % 12 === 0 || r.month === rows.length - 1);

  const summary = paidOff
    ? `Illustration: paid off in ${formatPayoffDuration(active.months)}, ${formatCurrency(
        active.totalInterest,
      )} interest, paying the ${activeOrder.label.toLowerCase()}.`
    : "Illustration: at these payments your debts are not paid off.";

  const lastIndex = rows.length - 1;
  const endLabel =
    (name: string, color: string) =>
    ({ x, y, index }: { x?: number | string; y?: number | string; index?: number }) =>
      index === lastIndex && typeof x === "number" && typeof y === "number" ? (
        <text className={chartLabel} fill={color} textAnchor="end" x={x} y={y - 8}>
          {name}
        </text>
      ) : null;

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
      ) : leftOver > 0 ? (
        <div className={leftOverRow}>
          <span>Your budget has {formatCurrency(leftOver)} left over each month.</span>
          {extraPayment !== useTarget ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onChangeExtraPayment(useTarget)}
            >
              Use {formatCurrency(leftOver)} left over
            </Button>
          ) : null}
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
      <p className={orderHint}>{activeOrder.hint}</p>

      <div className={outcome} data-testid="scenario-outcome" id="scenario-outcome">
        <p className={outcomeLabel}>
          {extraPayment > 0
            ? `With ${formatCurrency(extraPayment)} extra a month`
            : "With no extra payment"}
        </p>
        <p className={outcomeValue}>{outcomeText}</p>
        {paidOff ? (
          <dl className={outcomeSupport}>
            <div className={outcomeSupportItem}>
              <dt>Debt-free date</dt>
              <dd>{active.debtFreeDate}</dd>
            </div>
            <div className={outcomeSupportItem}>
              <dt>Interest compared with minimum payments only</dt>
              <dd>{interestLess > 0 ? `${formatCurrency(interestLess)} less` : "No change"}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <ChartFigure
        annotation={
          paidOff ? { x: active.months, label: `Paid off, ${active.debtFreeDate}` } : undefined
        }
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
        directLabels
        hideTitle
        pointCount={rows.length}
        summary={summary}
        title="How your debt comes down"
      >
        <div className={chartWrap}>
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={rows} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                {...chartXAxisProps}
                dataKey="month"
                tickFormatter={(m) => monthLabel(Number(m))}
                interval={0}
                ticks={ticks}
              />
              <YAxis {...chartYAxisProps} />
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
                  label={endLabel("Minimum payments only", chartColor("baseline"))}
                  name="Minimum payments only"
                />
              ) : null}
              <Line
                {...chartLineProps("debt")}
                dataKey="scenario"
                label={endLabel(
                  showBaseline ? "With the extra payment" : "Debt remaining",
                  chartColor("debt"),
                )}
                name={showBaseline ? "With the extra payment" : "Debt remaining"}
              />
              {paidOff ? (
                <ReferenceLine
                  label={{
                    value: `Paid off, ${active.debtFreeDate}`,
                    position: "insideTopRight",
                    className: chartLabel,
                    fill: chartColor("debt"),
                  }}
                  stroke={chartColor("grid")}
                  strokeDasharray="4 4"
                  x={active.months}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
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
