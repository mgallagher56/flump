import {
  CHART_INK,
  ChartFigure,
  ChartLegend,
  chartColor,
  formatAxisCurrency,
  formatMonthTick,
  niceYDomain,
  SimulatorSplitLayout,
  SliderField,
  useChartFigure,
} from "@repo/ui";
import { type FC, useId, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartCursorProps } from "~/features/charts/utils/chartProps";
import { evenYearTicks, maxYearTicks } from "~/features/mortgage/chartAxis";
import { formatDuration, formatRate } from "~/features/mortgage/mortgageFormat";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  chartWrap,
  controlsBody,
  dataCell,
  dataTable,
  outcomeColumn,
  outcomeLabel,
  outcomeNote,
  outcomePrompt,
  outcomeSupport,
  outcomeValue,
  stateNote,
  supportItem,
  toolHint,
} from "./OverpaymentSimulator.styles";

export interface OverpaymentSimulatorProps {
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
  overpayment: number;
  onOverpaymentChange: (val: number) => void;
  mortgageType?: "repayment" | "interest-only";
}

/** The early repayment charge fact, shown once as a quiet helper line under the overpayment slider. */
export const OVERPAYMENT_ERC_NOTE =
  "Many fixed-rate deals allow overpayments of up to 10% of the balance a year with no charge. Above that, an early repayment charge (ERC) may apply. Your lender's terms set out the limit.";

/** The overpayment slider range, shared with the overpay or save tool so both tabs agree. */
export const OVERPAYMENT_RANGE = { min: 0, max: 2500, step: 20 } as const;

interface ChartRow {
  /** Calendar year, as "2030". */
  year: string;
  /** Month and year of the point, as "Nov 2030": the tooltip label. */
  month: string;
  standard: number;
  overpay: number;
}

interface PlotProps {
  rows: readonly ChartRow[];
  showOverpay: boolean;
  standardName: string;
  overpayName: string;
  gradientId: string;
  formatCurrency: (value: number) => string;
}

/**
 * The drawing. Reads ticks from the enclosing ChartFigure. Lines carry no direct labels: one line
 * is named by the figure title, two by the figure's legend.
 */
const Plot: FC<PlotProps> = ({
  rows,
  showOverpay,
  standardName,
  overpayName,
  gradientId,
  formatCurrency,
}) => {
  const { maxTicks, plotPaddingRight } = useChartFigure();
  // Measured so a narrow plot keeps to a few year ticks (0 until measured: treated as wide).
  const [width, setWidth] = useState(0);
  const ticks = evenYearTicks(
    rows.map((row) => row.year),
    maxYearTicks(width, maxTicks),
  );
  const lastYear = rows.at(-1)?.year;
  // A little headroom over the balance, not a jump to the next round £100k.
  const domain = niceYDomain(
    rows.flatMap((row) => (showOverpay ? [row.standard, row.overpay] : [row.standard])),
    { padRatio: 0.05 },
  );
  return (
    <div className={chartWrap()}>
      <ResponsiveContainer height="100%" width="100%" onResize={(w) => setWidth(w)}>
        <AreaChart
          data={[...rows]}
          margin={{ top: 24, right: plotPaddingRight, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={chartColor("debt")} stopOpacity={0.12} />
              <stop offset="95%" stopColor={chartColor("debt")} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            axisLine={false}
            dataKey="year"
            interval={0}
            tick={(tick: {
              x?: number | string;
              y?: number | string;
              index?: number;
              payload?: { value?: string | number };
            }) => (
              <text
                fill={CHART_INK.axisText}
                fontSize={11}
                textAnchor={tick.payload?.value === lastYear ? "end" : "middle"}
                x={Number(tick.x ?? 0)}
                y={Number(tick.y ?? 0) + 12}
              >
                {tick.payload?.value}
              </text>
            )}
            tickLine={false}
            tickMargin={8}
            ticks={ticks}
          />
          <YAxis
            axisLine={false}
            domain={domain}
            fontSize={11}
            tickFormatter={(val) => formatAxisCurrency(Number(val))}
            tickLine={false}
            tickMargin={8}
          />
          <Tooltip
            cursor={chartCursorProps}
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(year, payload) =>
              (payload?.[0]?.payload as ChartRow | undefined)?.month ?? String(year)
            }
          />
          <Area
            activeDot={{ r: 6 }}
            dataKey="standard"
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            name={standardName}
            stroke={chartColor("debt")}
            strokeWidth={3}
            type="monotone"
          />
          {showOverpay ? (
            <Area
              activeDot={{ r: 6 }}
              dataKey="overpay"
              fill="none"
              isAnimationActive={false}
              name={overpayName}
              stroke={chartColor("projection")}
              strokeDasharray="7 6"
              strokeWidth={3}
              type="monotone"
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const OverpaymentSimulator: FC<OverpaymentSimulatorProps> = ({
  loanAmount,
  interestRate,
  remainingTerm,
  overpayment,
  onOverpaymentChange,
  mortgageType = "repayment",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const gradientId = `overpay-standard-${useId().replace(/:/g, "")}`;
  const isInterestOnly = mortgageType === "interest-only";
  // A zero (or negative) input means the user has not told us that figure yet.
  const hasInputs = loanAmount > 0 && interestRate > 0 && remainingTerm > 0;

  // Run amortisation schedules
  const simulation = useMemo(() => {
    if (!hasInputs) return null;

    const r = interestRate / 100;
    const i = r / 12;
    const totalMonths = Math.round(remainingTerm * 12);

    // Monthly scheduled payment
    let monthlyScheduled = isInterestOnly
      ? loanAmount * i
      : (loanAmount * i * (1 + i) ** totalMonths) / ((1 + i) ** totalMonths - 1);
    if (Number.isNaN(monthlyScheduled) || !Number.isFinite(monthlyScheduled)) {
      return null;
    }
    monthlyScheduled = Math.max(0, monthlyScheduled);

    // 1. Standard schedule
    const standardBalances: number[] = [loanAmount];
    let standardBalance = loanAmount;
    let standardTotalInterest = 0;

    for (let m = 1; m <= totalMonths; m++) {
      if (isInterestOnly) {
        const interest = standardBalance * i;
        standardTotalInterest += interest;
        standardBalances.push(standardBalance);
      } else {
        if (standardBalance <= 0) {
          standardBalances.push(0);
          continue;
        }
        const interest = standardBalance * i;
        const principal = Math.min(standardBalance, monthlyScheduled - interest);
        standardBalance = Math.max(0, standardBalance - principal);
        standardTotalInterest += interest;
        standardBalances.push(standardBalance);
      }
    }

    // 2. Overpayment schedule
    const overpayBalances: number[] = [loanAmount];
    let overpayBalance = loanAmount;
    let overpayTotalInterest = 0;
    let overpayMonthsToZero = totalMonths;
    let finishedOverpay = false;

    for (let m = 1; m <= totalMonths; m++) {
      if (overpayBalance <= 0) {
        if (!finishedOverpay) {
          overpayMonthsToZero = m - 1;
          finishedOverpay = true;
        }
        overpayBalances.push(0);
        continue;
      }

      const interest = overpayBalance * i;
      overpayTotalInterest += interest;

      if (isInterestOnly) {
        // In interest only, monthly scheduled pays the current interest,
        // and 100% of the overpayment reduces the loan principal.
        const principal = Math.min(overpayBalance, overpayment);
        overpayBalance = Math.max(0, overpayBalance - principal);
      } else {
        // Scheduled payment + overpayment
        const totalPayment = monthlyScheduled + overpayment;
        const principal = Math.min(overpayBalance, totalPayment - interest);
        overpayBalance = Math.max(0, overpayBalance - principal);
      }

      overpayBalances.push(overpayBalance);
    }

    if (overpayBalance <= 0 && !finishedOverpay) {
      overpayMonthsToZero = totalMonths;
    }

    // One point a year, labelled with the calendar year (this year first), and the end of the
    // term as the last point when it falls part way through a year.
    const now = new Date();
    const dateAt = (monthIdx: number) => new Date(now.getFullYear(), now.getMonth() + monthIdx, 1);
    // Built from a "YYYY-MM" key so the month never shifts with the time zone ("Sep", never "Sept").
    const monthAt = (monthIdx: number) => {
      const date = dateAt(monthIdx);
      return formatMonthTick(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      );
    };
    const rowAt = (monthIdx: number): ChartRow => ({
      year: String(dateAt(monthIdx).getFullYear()),
      month: monthAt(monthIdx),
      standard: Math.round(standardBalances[monthIdx] ?? (isInterestOnly ? loanAmount : 0)),
      overpay: Math.round(overpayBalances[monthIdx] ?? 0),
    });
    const chartData: ChartRow[] = [];
    for (let monthIdx = 0; monthIdx <= totalMonths; monthIdx += 12) {
      chartData.push(rowAt(monthIdx));
    }
    if (totalMonths % 12 !== 0) {
      const end = rowAt(totalMonths);
      if (chartData.at(-1)?.year === end.year) chartData[chartData.length - 1] = end;
      else chartData.push(end);
    }

    const monthsSaved = Math.max(0, totalMonths - overpayMonthsToZero);
    const interestSaved = Math.max(0, standardTotalInterest - overpayTotalInterest);
    const finalOverpayBalance = overpayBalances[overpayBalances.length - 1] ?? 0;
    const principalReduced = Math.max(0, loanAmount - finalOverpayBalance);

    return {
      monthlyScheduled,
      standardTotalInterest,
      overpayTotalInterest,
      interestSaved,
      monthsSaved,
      newTermMonths: overpayMonthsToZero,
      principalReduced,
      totalMonths,
      chartData,
    };
  }, [hasInputs, loanAmount, interestRate, remainingTerm, overpayment, isInterestOnly]);

  const interestSaved = simulation?.interestSaved ?? null;
  const monthsSaved = simulation?.monthsSaved ?? null;
  const showBulletReduced = isInterestOnly && monthsSaved === 0;

  const controls = (
    <div className={controlsBody()}>
      <p className={toolHint}>
        Model an extra payment each month to see the estimated payoff date.
      </p>

      <SliderField
        format="currency"
        helperText={OVERPAYMENT_ERC_NOTE}
        label="Extra each month"
        max={OVERPAYMENT_RANGE.max}
        min={OVERPAYMENT_RANGE.min}
        step={OVERPAYMENT_RANGE.step}
        value={overpayment}
        onChange={onOverpaymentChange}
      />
    </div>
  );

  if (simulation === null) {
    return (
      <SimulatorSplitLayout
        content={
          <p className={outcomeNote} id="overpayment-empty">
            Add your balance, interest rate and years left to see what overpaying would change.
          </p>
        }
        contentLabel="Overpayment results"
        controls={controls}
        controlsLabel="Overpayment settings"
        controlsSpan={4}
      />
    );
  }

  const chartData = simulation.chartData;
  const hasOverpayment = overpayment > 0;
  const standardTermLabel = formatDuration(simulation.totalMonths);

  const outcomeText = showBulletReduced
    ? `${formatCurrency(simulation.principalReduced)} less`
    : monthsSaved !== null && monthsSaved > 0
      ? formatDuration(monthsSaved)
      : "The same payoff date";

  const standardName = hasOverpayment ? "No overpayment" : "Balance owed";
  // The slider's value pill names the amount, so the line's name does not repeat it.
  const overpayName = "With overpayment";

  const content = (
    <div className={outcomeColumn()}>
      {hasOverpayment ? (
        <>
          <div data-testid="overpayment-outcome" id="overpayment-outcome">
            <p className={outcomeLabel}>
              {showBulletReduced ? "Less to repay at the end of the term" : "Paid off sooner by"}
            </p>
            <p className={outcomeValue}>{outcomeText}</p>
          </div>

          <dl className={outcomeSupport()}>
            <div className={supportItem()}>
              <dt>
                {isInterestOnly
                  ? "Interest payment with the extra"
                  : "Monthly payment with the extra"}
              </dt>
              <dd>{formatCurrency(simulation.monthlyScheduled + overpayment)}</dd>
            </div>
            <div className={supportItem()}>
              <dt>Less interest in total (estimate)</dt>
              <dd>{formatCurrency(interestSaved ?? 0)}</dd>
            </div>
          </dl>
        </>
      ) : (
        // At £0 there is no change to state: one short prompt, no figures (the payment and the
        // term are already on the page).
        <div data-testid="overpayment-outcome" id="overpayment-outcome">
          <p className={outcomeLabel}>With no overpayment</p>
          <p className={outcomePrompt}>Move the slider to see what changes</p>
        </div>
      )}

      <ChartFigure
        dataTable={
          <table className={dataTable()}>
            <caption>
              {hasOverpayment
                ? "Mortgage balance by year, no overpayment and with overpayment"
                : "Mortgage balance by year"}
            </caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">
                  {hasOverpayment ? "Balance owed, no overpayment" : "Balance owed"}
                </th>
                {hasOverpayment ? <th scope="col">Balance owed, with overpayment</th> : null}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.year}>
                  <th className={dataCell} scope="row">
                    {row.year}
                  </th>
                  <td className={dataCell}>{formatCurrency(row.standard)}</td>
                  {hasOverpayment ? (
                    <td className={dataCell}>{formatCurrency(row.overpay)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        }
        // One line is named by the title; two are named by the legend, never by labels on the plot.
        directLabels={false}
        legend={
          hasOverpayment ? (
            <ChartLegend
              items={[
                { id: "standard", label: standardName, color: "debt" },
                { id: "overpay", label: overpayName, color: "projection", swatch: "dashed" },
              ]}
            />
          ) : undefined
        }
        seriesCount={hasOverpayment ? 2 : 1}
        summary={
          hasOverpayment && interestSaved !== null && interestSaved > 0
            ? `Illustration: overpaying ${formatCurrency(overpayment)} a month means ${formatCurrency(interestSaved)} less interest in total${
                monthsSaved !== null && monthsSaved > 0
                  ? ` and the mortgage paid off ${formatDuration(monthsSaved)} sooner`
                  : ""
              }.`
            : isInterestOnly
              ? `Illustration: the balance owed stays at ${formatCurrency(loanAmount)} for the whole term.`
              : `Illustration: the mortgage is paid off over ${standardTermLabel}.`
        }
        // The outcome above already says what changes (and at £0 the summary would only repeat
        // the term), so the summary stays for screen readers.
        showSummary={false}
        hideTitle
        title="Mortgage balance by year"
      >
        <Plot
          formatCurrency={formatCurrency}
          gradientId={gradientId}
          overpayName={overpayName}
          rows={chartData}
          showOverpay={hasOverpayment}
          standardName={standardName}
        />
        <p className={stateNote}>
          Assumes the rate stays at {formatRate(interestRate)} for the whole term.
        </p>
      </ChartFigure>
    </div>
  );

  return (
    <SimulatorSplitLayout
      content={content}
      contentLabel="Overpayment results"
      controls={controls}
      controlsLabel="Overpayment settings"
      controlsSpan={4}
    />
  );
};
