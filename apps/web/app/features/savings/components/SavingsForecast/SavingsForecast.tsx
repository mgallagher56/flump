import {
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
} from "@repo/ui";
import { type FC, type ReactNode, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
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
  return `About ${pounds.format(Math.round(result.final))} in ${formatYears(values.years)}`;
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
  const ticks = pickTicks(chartData.map((d) => d.label));

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
        label="Interest rate (AER)"
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
          <p className={outcomeValue()}>{money(result.final)}</p>
          <dl className={outcomeSupport()}>
            <div className={outcomeSupportItem()}>
              <dt>You pay in</dt>
              <dd>{money(result.paidIn)}</dd>
            </div>
            <div className={outcomeSupportItem()}>
              <dt>Interest</dt>
              <dd>{money(result.interest)}</dd>
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
        hideTitle
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
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                axisLine={false}
                dataKey="label"
                tickLine={false}
                tickMargin={8}
                ticks={ticks}
              />
              <YAxis
                axisLine={false}
                tickFormatter={(val) => formatAxisCurrency(Number(val))}
                tickLine={false}
                tickMargin={8}
              />
              <Tooltip formatter={(value) => pounds.format(Number(value) || 0)} />
              <Area
                dataKey="balance"
                fill={chartColor("wealth")}
                fillOpacity={0.12}
                isAnimationActive={false}
                name="Estimated balance"
                stroke={chartColor("wealth")}
                strokeDasharray="5 5"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
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
