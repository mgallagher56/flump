import {
  ChartFigure,
  chartColor,
  EmptyState,
  formatAxisCurrency,
  Icon,
  KpiCard,
  KpiStrip,
  Money,
  SimulatorSplitLayout,
  SliderField,
  StatusBadge,
} from "@repo/ui";
import { PiggyBank } from "lucide-react";
import { type FC, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  cardHeading,
  cardSubtitle,
  chartLegend,
  chartLegendItem,
  chartWrap,
  controlsCard,
  dataCell,
  dataTable,
  durationValue,
  legendSwatch,
  resultsCard,
  resultsHeader,
  resultsHeaderText,
  scheduleSummary,
  summaryRow,
} from "./OverpaymentSimulator.styles";

export interface OverpaymentSimulatorProps {
  loanAmount: number;
  interestRate: number;
  remainingTerm: number;
  overpayment: number;
  onOverpaymentChange: (val: number) => void;
  mortgageType?: "repayment" | "interest-only";
}

export const OVERPAYMENT_ERC_NOTE =
  "Most fixed-rate deals let you overpay up to 10% of the balance a year without charge. Above that, an early repayment charge (ERC) may apply. Check your lender's terms.";

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
        yearLabel: "Yr 0",
        "Standard Plan": Math.round(loanAmount),
        "With Overpayment": Math.round(loanAmount),
      },
    ];

    for (let y = 1; y <= remainingTerm; y++) {
      const monthIdx = y * 12;
      chartData.push({
        yearLabel: `Yr ${y}`,
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
    <div className={controlsCard()}>
      <div>
        <h3 className={cardHeading}>Overpayment</h3>
        <p className={cardSubtitle}>
          Simulate paying extra each month to save interest and pay off earlier.
        </p>
      </div>

      <SliderField
        helperText={OVERPAYMENT_ERC_NOTE}
        label="Monthly overpayment"
        max={2500}
        min={0}
        step={20}
        unitPrefix="+£"
        unitSuffix="/mo"
        value={overpayment}
        onChange={onOverpaymentChange}
      />

      <div className={scheduleSummary()}>
        <span className={summaryRow()}>
          <span>Scheduled {isInterestOnly ? "interest" : "monthly"} payment:</span>
          <Money size="sm" value={monthlyScheduled} />
        </span>
        <span className={summaryRow()}>
          <span>Total monthly outflow:</span>
          <Money
            size="sm"
            value={monthlyScheduled === null ? null : monthlyScheduled + overpayment}
          />
        </span>
      </div>
    </div>
  );

  const chartData = simulation?.chartData ?? [];

  const content = (
    <div className={resultsCard()}>
      <div className={resultsHeader()}>
        <div className={resultsHeaderText}>
          <h3 className={cardHeading}>Amortisation projection</h3>
          <p className={cardSubtitle}>Estimate comparing scheduled balance reduction paths.</p>
        </div>
        {simulation && overpayment > 0 && interestSaved !== null && interestSaved > 0 && (
          <StatusBadge size="sm" variant="positive">
            Save {formatCurrency(interestSaved)} in total interest
          </StatusBadge>
        )}
      </div>

      {simulation ? (
        <ChartFigure
          dataTable={
            <table className={dataTable()}>
              <caption>Mortgage balance by year, standard plan and with overpayment</caption>
              <thead>
                <tr>
                  <th scope="col">Year</th>
                  <th scope="col">Standard plan</th>
                  <th scope="col">With overpayment</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.yearLabel}>
                    <th scope="row">{row.yearLabel}</th>
                    <td className={dataCell}>{formatCurrency(row["Standard Plan"])}</td>
                    <td className={dataCell}>{formatCurrency(row["With Overpayment"])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          summary={`Mortgage balance over ${remainingTerm} years. ${
            overpayment > 0 && interestSaved !== null && interestSaved > 0
              ? `Overpaying ${formatCurrency(overpayment)} a month saves ${formatCurrency(interestSaved)} in total interest${
                  monthsSaved !== null && monthsSaved > 0
                    ? ` and clears the mortgage ${Math.floor(monthsSaved / 12)} years and ${monthsSaved % 12} months sooner`
                    : ""
                }.`
              : "Add a monthly overpayment to see the interest saved."
          }`}
          hideTitle
          title="Mortgage balance projection"
        >
          <div className={chartWrap()}>
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStandard" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColor("debt")} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={chartColor("debt")} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOverpay" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartColor("wealth")} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={chartColor("wealth")} stopOpacity={0} />
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
                  fill="url(#colorStandard)"
                  isAnimationActive={false}
                  stroke={chartColor("debt")}
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  activeDot={{ r: 6 }}
                  dataKey="With Overpayment"
                  fill="url(#colorOverpay)"
                  isAnimationActive={false}
                  stroke={chartColor("wealth")}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={chartLegend()}>
            <span className={chartLegendItem()}>
              <span aria-hidden="true" className={legendSwatch({ kind: "standard" })} />
              Standard plan
            </span>
            <span className={chartLegendItem()}>
              <span aria-hidden="true" className={legendSwatch({ kind: "overpay" })} />
              With overpayment
            </span>
          </div>
        </ChartFigure>
      ) : (
        <EmptyState
          description="Add your balance, interest rate and remaining term to see how overpaying could change your mortgage."
          headingLevel="h3"
          icon={<Icon icon={PiggyBank} />}
          id="overpayment-empty"
          size="sm"
          title="Mortgage details not set"
          tone="muted"
        />
      )}

      <KpiStrip columns={3}>
        <KpiCard
          label="Interest saved"
          subtext="Estimate"
          tone="hero"
          value={
            interestSaved === null ? null : (
              <Money size="lg" tone="onContrast" value={interestSaved} />
            )
          }
        />
        <KpiCard
          label="Time shaved off"
          subtext="Estimate"
          value={
            monthsSaved === null ? null : (
              <span className={durationValue}>{formatDuration(monthsSaved)}</span>
            )
          }
        />
        <KpiCard
          label={showBulletReduced ? "Bullet balance reduced" : "New payoff term"}
          subtext="Estimate"
          value={
            simulation === null ? null : showBulletReduced ? (
              <Money size="lg" value={simulation.principalReduced} />
            ) : (
              <span className={durationValue}>{formatDuration(simulation.newTermMonths)}</span>
            )
          }
        />
      </KpiStrip>
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
