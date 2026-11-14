import {
  ChartFigure,
  chartColor,
  formatAxisCurrency,
  Money,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { type FC, useId, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  chartLegend,
  chartLegendItem,
  chartWrap,
  controlsBody,
  dataCell,
  dataTable,
  legendSwatch,
  outcomeColumn,
  outcomeLabel,
  outcomeNote,
  outcomeSupport,
  outcomeValue,
  scheduleSummary,
  stateNote,
  summaryRow,
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

/** The early repayment charge fact. The page shows it once, as the lead of the zone's notice. */
export const OVERPAYMENT_ERC_NOTE =
  "Many fixed-rate deals allow overpayments of up to 10% of the balance a year with no charge. Above that, an early repayment charge (ERC) may apply. Your lender's terms set out the limit.";

interface ChartRow {
  yearLabel: string;
  "Standard Plan": number;
  "With Overpayment": number;
}

const pluralise = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/** "2 years 3 months", dropping a zero part. Zero in total reads "0 months". */
const formatDuration = (totalMonths: number): string => {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(pluralise(years, "year"));
  if (months > 0 || years === 0) parts.push(pluralise(months, "month"));
  return parts.join(" ");
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
    const totalMonths = remainingTerm * 12;

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

    // Group by year for the chart to keep performance high and graph clean
    const chartData: ChartRow[] = [
      {
        yearLabel: "Now",
        "Standard Plan": Math.round(loanAmount),
        "With Overpayment": Math.round(loanAmount),
      },
    ];

    for (let y = 1; y <= remainingTerm; y++) {
      const monthIdx = y * 12;
      chartData.push({
        yearLabel: `Year ${y}`,
        "Standard Plan": Math.round(
          standardBalances[monthIdx] ?? (isInterestOnly ? loanAmount : 0),
        ),
        "With Overpayment": Math.round(overpayBalances[monthIdx] ?? 0),
      });
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
      chartData,
    };
  }, [hasInputs, loanAmount, interestRate, remainingTerm, overpayment, isInterestOnly]);

  const monthlyScheduled = simulation?.monthlyScheduled ?? null;
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
        label="Extra each month"
        max={2500}
        min={0}
        step={20}
        value={overpayment}
        onChange={onOverpaymentChange}
      />

      {monthlyScheduled === null ? null : (
        <dl className={scheduleSummary()}>
          <div className={summaryRow()}>
            <dt>Usual {isInterestOnly ? "interest" : "monthly"} payment:</dt>
            <dd>
              <Money size="sm" value={monthlyScheduled} />
            </dd>
          </div>
          <div className={summaryRow()}>
            <dt>Total each month:</dt>
            <dd>
              <Money size="sm" value={monthlyScheduled + overpayment} />
            </dd>
          </div>
        </dl>
      )}
    </div>
  );

  const chartData = simulation?.chartData ?? [];

  const hasOverpayment = overpayment > 0;
  const standardTermLabel = formatDuration(remainingTerm * 12);

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

  const outcomeText = showBulletReduced
    ? `${formatCurrency(simulation.principalReduced)} less`
    : monthsSaved !== null && monthsSaved > 0
      ? formatDuration(monthsSaved)
      : "No change yet";
  const outcomeDetail = showBulletReduced
    ? `Left to repay at the end of the term: ${formatCurrency(loanAmount - simulation.principalReduced)}.`
    : hasOverpayment && monthsSaved !== null && monthsSaved > 0
      ? `Paid off in ${formatDuration(simulation.newTermMonths)} instead of ${standardTermLabel}.`
      : `Add a monthly overpayment to see the change. Term now: ${standardTermLabel}.`;

  const content = (
    <div className={outcomeColumn()}>
      <div data-testid="overpayment-outcome" id="overpayment-outcome">
        <p className={outcomeLabel}>
          {showBulletReduced ? "Less to repay at the end of the term" : "Paid off sooner by"}
        </p>
        <p className={outcomeValue}>{outcomeText}</p>
        <p className={outcomeNote}>{outcomeDetail}</p>
      </div>

      <dl className={outcomeSupport()}>
        <div className={supportItem()}>
          <dt>
            {isInterestOnly ? "Interest payment with the extra" : "Monthly payment with the extra"}
          </dt>
          <dd>{formatCurrency(simulation.monthlyScheduled + overpayment)}</dd>
        </div>
        <div className={supportItem()}>
          <dt>Less interest in total (estimate)</dt>
          <dd>{formatCurrency(interestSaved ?? 0)}</dd>
        </div>
      </dl>

      <ChartFigure
        dataTable={
          <table className={dataTable()}>
            <caption>Mortgage balance by year, no overpayment and with overpayment</caption>
            <thead>
              <tr>
                <th scope="col">Year</th>
                <th scope="col">Balance owed, no overpayment</th>
                <th scope="col">Balance owed, with overpayment</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.yearLabel}>
                  <th className={dataCell} scope="row">
                    {row.yearLabel}
                  </th>
                  <td className={dataCell}>{formatCurrency(row["Standard Plan"])}</td>
                  <td className={dataCell}>{formatCurrency(row["With Overpayment"])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        summary={
          hasOverpayment && interestSaved !== null && interestSaved > 0
            ? `Illustration: overpaying ${formatCurrency(overpayment)} a month means ${formatCurrency(interestSaved)} less interest in total${
                monthsSaved !== null && monthsSaved > 0
                  ? ` and the mortgage paid off ${formatDuration(monthsSaved)} sooner`
                  : ""
              }.`
            : "Add a monthly overpayment to see the change in interest."
        }
        hideTitle
        title="Mortgage balance by year"
      >
        <div className={chartLegend()}>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "standard" })} />
            {isInterestOnly
              ? `No overpayment, the full ${formatCurrency(loanAmount)} is due at the end (solid)`
              : `No overpayment, ends after ${standardTermLabel} (solid)`}
          </span>
          <span className={chartLegendItem()}>
            <span aria-hidden="true" className={legendSwatch({ kind: "overpay" })} />
            {hasOverpayment
              ? `With ${formatCurrency(overpayment)} a month extra${
                  isInterestOnly ? "" : `, ends after ${formatDuration(simulation.newTermMonths)}`
                } (dashed)`
              : "With overpayment (dashed)"}
          </span>
        </div>
        <div className={chartWrap()}>
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={chartColor("debt")} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={chartColor("debt")} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                axisLine={false}
                dataKey="yearLabel"
                fontSize={11}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                fontSize={11}
                tickFormatter={(val) => formatAxisCurrency(Number(val))}
                tickLine={false}
                tickMargin={8}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area
                activeDot={{ r: 6 }}
                dataKey="Standard Plan"
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                name="No overpayment"
                stroke={chartColor("debt")}
                strokeWidth={3}
                type="monotone"
              />
              <Area
                activeDot={{ r: 6 }}
                dataKey="With Overpayment"
                fill="none"
                isAnimationActive={false}
                name="With overpayment"
                stroke={chartColor("projection")}
                strokeDasharray="7 6"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className={stateNote}>
          Assumes the rate stays at{" "}
          {new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(interestRate)}% for
          the whole term.
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
