import {
  CHART_AXIS_DEFAULTS,
  ChartFigure,
  Checkbox,
  CollapsibleDrawer,
  CurrencyInput,
  chartColor,
  controlProps,
  FormField,
  formatAxisCurrency,
  Money,
  pickTicks,
  SimulatorSplitLayout,
  SliderField,
  Table,
  TBody,
  Td,
  THead,
  Th,
  xTickAnchor,
} from "@repo/ui";
import { type FC, type ReactNode, useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEstimate } from "~/utils/roundEstimate";
import { nearDataAxis } from "~/utils/yAxisTicks";
import {
  annotationChip,
  annotationText,
  chartWrap,
  forecastContent,
  forecastControls,
  goalLine,
  moreOptions,
  outcome,
  outcomeLabel,
  outcomeSupport,
  outcomeSupportItem,
  outcomeValue,
} from "./SavingsForecast.styles";
import {
  formatDuration,
  formatYears,
  GOAL_SEARCH_MONTHS,
  monthsToGoal,
  projectSavings,
  TODAYS_MONEY_INFLATION,
} from "./savingsForecast.utils";

/** Scenario inputs only. Unknown saved values stay null (an empty field), never 0. */
// A type alias (not an interface) so it satisfies useScenarioState's record constraint.
export type SavingsForecastValues = {
  monthly: number | null;
  rate: number | null;
  years: number;
  todaysMoney: boolean;
  goal: number | null;
};

export const DEFAULT_FORECAST_YEARS = 5;

export const FORECAST_PROMPT =
  "Add a monthly amount or an interest rate to see how your savings could grow.";

export interface SavingsForecastProps {
  values: SavingsForecastValues;
  onChange: <K extends keyof SavingsForecastValues>(
    key: K,
    value: SavingsForecastValues[K],
  ) => void;
  /** Today's total across the saved accounts. */
  startingBalance: number;
  /** Extra a month from a pay rise handed over from Take-home pay. Added to the monthly amount. */
  payRiseMonthly?: number;
  /** The removable pay rise row, shown above the inputs when a pay rise was handed over. */
  payRise?: ReactNode;
  /** Calendar year of "today", for the chart axis. */
  startYear?: number;
}

const pounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** Chip geometry for the end label, in SVG units (one unit per CSS pixel). */
const CHIP_HEIGHT = 22;
const CHIP_PADDING = 8;
const CHIP_CHAR_WIDTH = 7;

/** Whole pounds, en-GB (P8). */
const money = (n: number): string => pounds.format(Math.round(n));

const runProjection = (values: SavingsForecastValues, starting: number, payRise: number) =>
  projectSavings({
    starting,
    monthly: (values.monthly ?? 0) + payRise,
    rate: values.rate ?? 0,
    years: values.years,
    todaysMoney: values.todaysMoney,
  });

/** The one outcome line, for the zone's announcement. */
export function forecastOutcomeText(
  values: SavingsForecastValues,
  startingBalance: number,
  payRiseMonthly = 0,
): string {
  const result = runProjection(values, startingBalance, payRiseMonthly);
  if (result.flat) return FORECAST_PROMPT;
  return `${formatEstimate(result.final)} in ${formatYears(values.years)}`;
}

/**
 * How savings could grow (E16 PR 7): monthly amount, rate and years ahead, with today's money and
 * an optional goal behind "More options". One outcome, 2 supporting figures and one chart; no
 * chart when the line would be flat (P10.6). Lives inside the page's ScenarioZone: nothing here
 * is saved.
 */
export const SavingsForecast: FC<SavingsForecastProps> = ({
  values,
  onChange,
  startingBalance,
  payRiseMonthly = 0,
  payRise,
  startYear = new Date().getFullYear(),
}) => {
  const result = useMemo(
    () => runProjection(values, startingBalance, payRiseMonthly),
    [values, startingBalance, payRiseMonthly],
  );

  const chartData = useMemo(
    () => result.points.map((p) => ({ label: String(startYear + p.year), balance: p.balance })),
    [result.points, startYear],
  );
  const ticks = pickTicks(
    chartData.map((d) => d.label),
    CHART_AXIS_DEFAULTS.maxXTicks,
  );
  const yAxis = useMemo(() => nearDataAxis(chartData.map((d) => d.balance)), [chartData]);
  const last = chartData[chartData.length - 1];
  const endLabel = `In ${formatYears(values.years)}`;

  const goal = values.goal !== null && values.goal > 0 ? values.goal : null;
  const goalResult =
    goal === null
      ? null
      : monthsToGoal({
          starting: startingBalance,
          monthly: (values.monthly ?? 0) + payRiseMonthly,
          effectiveRate: result.effectiveRate,
          goal,
        });
  const goalText =
    goalResult === null
      ? null
      : goalResult.status === "reached"
        ? "Your starting amount is already above your goal."
        : goalResult.status === "months"
          ? `Estimated time to reach your goal: ${formatDuration(goalResult.months)}`
          : `This estimate does not reach your goal within ${formatYears(GOAL_SEARCH_MONTHS / 12)}.`;

  const controls = (
    <div className={forecastControls()}>
      {payRise}
      <SliderField
        format="currency"
        label="Monthly amount"
        max={2000}
        min={0}
        step={25}
        value={values.monthly}
        onChange={(value) => onChange("monthly", value)}
        onClear={() => onChange("monthly", null)}
      />
      <SliderField
        format="percent"
        fractionDigits={1}
        label="Average rate (AER)"
        max={10}
        min={0}
        step={0.1}
        value={values.rate}
        onChange={(value) => onChange("rate", value)}
        onClear={() => onChange("rate", null)}
      />
      <SliderField
        label="Years ahead"
        max={40}
        min={1}
        step={1}
        unitSuffix=" years"
        value={values.years}
        onChange={(value) => onChange("years", value)}
      />
      <CollapsibleDrawer title="More options" variant="quiet">
        <div className={moreOptions()}>
          <Checkbox
            checked={values.todaysMoney}
            data-testid="forecast-todays-money"
            hint={`Takes ${TODAYS_MONEY_INFLATION}% a year off the rate for inflation.`}
            id="forecast-todays-money"
            label="Show in today's money"
            onChange={(e) => onChange("todaysMoney", e.target.checked)}
          />
          <FormField hint="See how long it could take to reach an amount." label="Your own goal">
            {(field) => (
              <CurrencyInput
                {...controlProps(field)}
                min={0}
                value={values.goal}
                onValueChange={(value) => onChange("goal", value)}
              />
            )}
          </FormField>
        </div>
      </CollapsibleDrawer>
    </div>
  );

  const content = (
    <div className={forecastContent()}>
      {result.flat ? null : (
        <div
          className={outcome()}
          data-testid="savings-forecast-outcome"
          id="savings-forecast-outcome"
        >
          <p className={outcomeLabel()}>Estimated balance in {formatYears(values.years)}</p>
          <p className={outcomeValue()}>{formatEstimate(result.final)}</p>
          <dl className={outcomeSupport()}>
            <div className={outcomeSupportItem()}>
              <dt>You pay in</dt>
              <dd>{money(result.paidIn)}</dd>
            </div>
            <div className={outcomeSupportItem()}>
              <dt>Interest</dt>
              {/* An estimate, rounded like the balance. "You pay in" is plain arithmetic. */}
              <dd>{formatEstimate(result.interest)}</dd>
            </div>
          </dl>
          {goalText ? (
            <p
              className={goalLine()}
              data-testid="savings-forecast-goal"
              id="savings-forecast-goal"
            >
              {goalText}
            </p>
          ) : null}
        </div>
      )}
      <ChartFigure
        dataTable={
          <Table caption="Estimated savings balance by year">
            <THead>
              <tr>
                <Th>Year</Th>
                <Th numeric>Estimated balance</Th>
              </tr>
            </THead>
            <TBody>
              {chartData.map((row) => (
                <tr key={row.label}>
                  <Td>{row.label}</Td>
                  <Td numeric>
                    <Money size="sm" value={row.balance} />
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
        }
        notEnoughDataText={FORECAST_PROMPT}
        pointCount={result.flat ? 0 : chartData.length}
        summary={
          result.flat
            ? "In this estimate your balance stays the same."
            : `Estimated balance each year${values.todaysMoney ? " in today's money" : ""}, with interest added monthly. Real returns can differ.`
        }
        title="Estimated savings balance"
      >
        <div className={chartWrap()}>
          <ResponsiveContainer height="100%" width="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 36,
                right: CHART_AXIS_DEFAULTS.plotPaddingRight,
                left: -10,
                bottom: 0,
              }}
            >
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={({ x, y, payload, index }) => (
                  <text
                    className="recharts-cartesian-axis-tick-value"
                    dy={16}
                    textAnchor={xTickAnchor(index, ticks.length)}
                    x={x}
                    y={y}
                  >
                    {payload.value}
                  </text>
                )}
                tickLine={false}
                ticks={ticks}
              />
              <YAxis
                axisLine={false}
                domain={yAxis.domain}
                // Every round tick is drawn (the set is already short), so £0 never drops out.
                interval={0}
                tickFormatter={(val) => formatAxisCurrency(Number(val))}
                tickLine={false}
                tickMargin={8}
                ticks={yAxis.ticks}
              />
              <Tooltip formatter={(value) => pounds.format(Number(value) || 0)} />
              {/* A line, not an area: the axis starts near the data, so a fill would overstate growth. */}
              <Line
                dataKey="balance"
                dot={false}
                isAnimationActive={false}
                name="Estimated balance"
                stroke={chartColor("wealth")}
                strokeDasharray="5 5"
                strokeWidth={2}
                type="monotone"
              />
              {last ? (
                <ReferenceDot
                  fill={chartColor("wealth")}
                  // Direct label above and left of the end point, on a chip (P10.3).
                  label={({ viewBox }: { viewBox?: { x?: number; y?: number } }) => {
                    const x = (viewBox?.x ?? 0) - 6;
                    const y = (viewBox?.y ?? 0) - 8;
                    const width = endLabel.length * CHIP_CHAR_WIDTH + CHIP_PADDING * 2;
                    return (
                      <g>
                        <rect
                          className={annotationChip()}
                          height={CHIP_HEIGHT}
                          rx={CHIP_HEIGHT / 2}
                          width={width}
                          x={x - width}
                          y={y - CHIP_HEIGHT}
                        />
                        <text
                          className={annotationText()}
                          dominantBaseline="middle"
                          textAnchor="end"
                          x={x - CHIP_PADDING}
                          y={y - CHIP_HEIGHT / 2}
                        >
                          {endLabel}
                        </text>
                      </g>
                    );
                  }}
                  r={5}
                  stroke="none"
                  x={last.label}
                  y={last.balance}
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
      contentLabel="Estimate"
      controls={controls}
      controlsLabel="Estimate settings"
      controlsSpan={4}
    />
  );
};

export default SavingsForecast;
