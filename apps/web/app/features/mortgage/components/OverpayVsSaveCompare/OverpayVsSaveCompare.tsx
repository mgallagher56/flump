import {
  Card,
  ChartFigure,
  chartColor,
  EmptyState,
  formatAxisCurrency,
  Icon,
  KpiCard,
  KpiStrip,
  Money,
  Num,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { Coins, Info, Scale } from "lucide-react";
import { type FC, useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";
import {
  chartWrapper,
  controlPanel,
  dataCell,
  dataTable,
  fieldGroup,
  fieldLabel,
  kpiNote,
  noteIcon,
  noteRow,
  noteText,
  panelHint,
  panelTitle,
  rateLabel,
  rateList,
  rateRow,
  rateValue,
  resultsCard,
  resultsHeader,
  selectStyle,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
  verdictPanel,
  verdictText,
  verdictTitle,
} from "./OverpayVsSaveCompare.styles";

export interface OverpayVsSaveCompareProps {
  loanAmount: number;
  interestRate: number; // Mortgage Rate
  remainingTerm: number;
  overpayment: number; // Monthly budget
  mortgageType?: "repayment" | "interest-only";
}

export const ERC_CAVEAT =
  "Most fixed-rate deals let you overpay up to 10% of the balance a year without charge. Above that, an early repayment charge (ERC) may apply. Check your lender's terms.";

const percentFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = (value: number) => `${percentFormat.format(value)}%`;

const TAX_OPTIONS = [
  { value: "isa", label: "ISA / tax-free (0% tax)" },
  { value: "basic", label: "Basic rate (20% tax)" },
  { value: "higher", label: "Higher rate (40% tax)" },
  { value: "additional", label: "Additional rate (45% tax)" },
] as const;

export const OverpayVsSaveCompare: FC<OverpayVsSaveCompareProps> = ({
  loanAmount,
  interestRate,
  remainingTerm,
  overpayment,
  mortgageType = "repayment",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const reducedMotion = usePrefersReducedMotion();
  const taxSelectId = useId();
  const isInterestOnly = mortgageType === "interest-only";
  const [savingsRate, setSavingsRate] = useState<number>(4.8); // Default 4.8% savings ROI
  const [taxBracket, setTaxBracket] = useState<string>("isa"); // 'isa' (0%), 'basic' (20%), 'higher' (40%), 'additional' (45%)
  const [horizonYears, setHorizonYears] = useState<number>(10); // Simulation horizon default 10 years

  const inputsKnown = loanAmount > 0 && interestRate > 0 && remainingTerm > 0;
  const horizonMax = Math.max(1, Math.floor(remainingTerm));
  const horizonValue = Math.min(horizonYears, horizonMax);

  // Tax bracket multiplier
  const taxMultiplier = useMemo(() => {
    switch (taxBracket) {
      case "basic":
        return 0.8; // 20% tax
      case "higher":
        return 0.6; // 40% tax
      case "additional":
        return 0.55; // 45% tax
      default:
        return 1.0; // Tax-free / ISA
    }
  }, [taxBracket]);

  const netSavingsRate = savingsRate * taxMultiplier;

  // Comparison simulation
  const comparisonData = useMemo(() => {
    // One rule: the simulated horizon is exactly what the slider shows (whole years, at least 1,
    // capped at the remaining term rounded down). A term under a year simulates one year; the
    // loan simply clears early because principal is capped at the balance.
    const H = Math.min(horizonYears, horizonMax);
    const totalMonths = H * 12;

    const im = interestRate / 100 / 12;
    const is = netSavingsRate / 100 / 12;

    // Monthly scheduled mortgage payment
    let monthlyScheduled = 0;
    if (loanAmount > 0 && interestRate > 0 && remainingTerm > 0) {
      if (isInterestOnly) {
        monthlyScheduled = loanAmount * im;
      } else {
        const n = remainingTerm * 12;
        monthlyScheduled = (loanAmount * im * (1 + im) ** n) / ((1 + im) ** n - 1);
      }
    }
    if (Number.isNaN(monthlyScheduled) || !Number.isFinite(monthlyScheduled)) {
      monthlyScheduled = 0;
    }

    // 1. Amortize Standard Mortgage
    let standardBalance = loanAmount;
    let standardCumulativeInterest = 0;
    for (let m = 1; m <= totalMonths; m++) {
      const interest = standardBalance * im;
      standardCumulativeInterest += interest;
      if (!isInterestOnly) {
        const principal = Math.min(standardBalance, monthlyScheduled - interest);
        standardBalance = Math.max(0, standardBalance - principal);
      }
    }

    // 2. Amortize Overpayment Mortgage
    let overpayBalance = loanAmount;
    let overpayCumulativeInterest = 0;
    for (let m = 1; m <= totalMonths; m++) {
      const interest = overpayBalance * im;
      overpayCumulativeInterest += interest;
      if (isInterestOnly) {
        const principal = Math.min(overpayBalance, overpayment);
        overpayBalance = Math.max(0, overpayBalance - principal);
      } else {
        const principal = Math.min(overpayBalance, monthlyScheduled + overpayment - interest);
        overpayBalance = Math.max(0, overpayBalance - principal);
      }
    }

    // Debt reduction = Standard Balance - Overpay Balance
    const principalReduced = Math.max(0, standardBalance - overpayBalance);
    const cumulativeInterestSaved = Math.max(
      0,
      standardCumulativeInterest - overpayCumulativeInterest,
    );
    const debtReduction = isInterestOnly
      ? principalReduced + cumulativeInterestSaved
      : principalReduced;

    // 3. Savings Account Accumulation
    let savingsBalance = 0;
    for (let m = 1; m <= totalMonths; m++) {
      savingsBalance = savingsBalance * (1 + is) + overpayment;
    }

    const totalInvested = overpayment * totalMonths;
    const mortgageInterestSaved = isInterestOnly
      ? cumulativeInterestSaved
      : Math.max(0, debtReduction - totalInvested);
    const savingsInterestEarned = Math.max(0, savingsBalance - totalInvested);

    const difference = Math.abs(debtReduction - savingsBalance);
    const isOverpayBetter = debtReduction > savingsBalance;

    return {
      debtReduction,
      savingsBalance,
      totalInvested,
      mortgageInterestSaved,
      savingsInterestEarned,
      difference,
      isOverpayBetter,
      actualHorizon: H,
    };
  }, [
    loanAmount,
    interestRate,
    remainingTerm,
    overpayment,
    netSavingsRate,
    horizonYears,
    horizonMax,
    isInterestOnly,
  ]);

  const {
    debtReduction,
    savingsBalance,
    totalInvested,
    mortgageInterestSaved,
    savingsInterestEarned,
    difference,
    isOverpayBetter,
    actualHorizon,
  } = comparisonData;

  const chartData = [
    {
      name: "Overpay mortgage",
      "Principal Contributed": totalInvested,
      "Interest Saved": Math.round(mortgageInterestSaved),
      Total: Math.round(debtReduction),
    },
    {
      name: "Save in ISA / savings",
      "Principal Contributed": totalInvested,
      "Interest Earned (Net)": Math.round(savingsInterestEarned),
      Total: Math.round(savingsBalance),
    },
  ];

  const outcome = isOverpayBetter ? "overpay" : "save";

  const controls = (
    <div className={controlPanel()}>
      <h3 className={panelTitle}>Savings parameters</h3>
      <p className={panelHint}>
        These are assumptions you can edit. Set your savings rate and tax circumstances to compare
        options.
      </p>

      <SliderField
        helperText="Assumption: change this to match your account."
        label="Savings interest rate"
        max={12}
        min={0.1}
        step={0.05}
        unitSuffix="%"
        value={savingsRate}
        onChange={setSavingsRate}
      />

      <div className={fieldGroup}>
        <label className={fieldLabel} htmlFor={taxSelectId}>
          Savings tax bracket (UK)
        </label>
        <select
          className={selectStyle}
          id={taxSelectId}
          value={taxBracket}
          onChange={(e) => setTaxBracket(e.target.value)}
        >
          {TAX_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <SliderField
        helperText="Assumption: how many whole years to compare. It cannot exceed your remaining term (rounded down, minimum 1 year)."
        label="Horizon (years)"
        max={horizonMax}
        min={1}
        step={1}
        unitSuffix="yrs"
        value={horizonValue}
        onChange={setHorizonYears}
      />
    </div>
  );

  const content = (
    <Card className={resultsCard()}>
      <div className={resultsHeader}>
        <h3 className={panelTitle}>Mortgage overpay vs. savings comparison</h3>
        <p className={panelHint}>
          {overpayment > 0 && inputsKnown
            ? `Estimate over a ${actualHorizon}-year horizon with a ${formatCurrency(overpayment)}/mo budget.`
            : "Estimate based on the figures you have set."}
        </p>
      </div>

      {overpayment <= 0 ? (
        <EmptyState
          headingLevel="h3"
          icon={<Icon icon={Coins} size="lg" />}
          description="Set a monthly overpayment budget on the Overpayment Simulator tab to compare options."
          id="overpay-compare-no-budget"
          size="sm"
          title="No overpayment budget set"
        />
      ) : (
        <>
          <dl className={rateList}>
            <div className={rateRow}>
              <dt className={rateLabel}>Mortgage interest rate (interest you avoid paying)</dt>
              <dd className={rateValue({ tone: "danger" })}>
                <Num
                  data-testid="overpay-compare-mortgage-rate"
                  fractionDigits={2}
                  id="overpay-compare-mortgage-rate"
                  kind="percent"
                  size="sm"
                  tone="danger"
                  value={interestRate > 0 ? interestRate : null}
                />
              </dd>
            </div>
            <div className={rateRow}>
              <dt className={rateLabel}>Savings net interest rate (tax-adjusted)</dt>
              <dd className={rateValue({ tone: "positive" })}>
                <Num
                  data-testid="overpay-compare-net-rate"
                  fractionDigits={2}
                  id="overpay-compare-net-rate"
                  kind="percent"
                  size="sm"
                  tone="positive"
                  value={netSavingsRate}
                />
              </dd>
            </div>
          </dl>

          {inputsKnown ? (
            <>
              <div className={verdictPanel({ outcome })}>
                <h4 className={verdictTitle({ outcome })}>
                  <Icon icon={Scale} size="md" />
                  <span>
                    Difference over {actualHorizon} years: {formatCurrency(difference)}
                  </span>
                </h4>
                <p className={verdictText}>
                  Mortgage rate <strong>{pct(interestRate)}</strong>, tax-adjusted net savings rate{" "}
                  <strong>{pct(netSavingsRate)}</strong>. Overpaying the mortgage is worth{" "}
                  <strong>{formatCurrency(debtReduction)}</strong> and saving the money is worth{" "}
                  <strong>{formatCurrency(savingsBalance)}</strong> over {actualHorizon} years. In
                  this estimate, {isOverpayBetter ? "overpaying the mortgage" : "saving the money"}{" "}
                  gives a total <strong>{formatCurrency(difference)}</strong> higher.
                </p>
                <div className={noteRow}>
                  <Icon className={noteIcon} icon={Info} size="sm" />
                  <p
                    className={noteText}
                    data-testid="overpay-compare-erc-caveat"
                    id="overpay-compare-erc-caveat"
                  >
                    {ERC_CAVEAT}
                  </p>
                </div>
              </div>

              <ChartFigure
                dataTable={
                  <table className={dataTable}>
                    <caption>Overpaying the mortgage compared with saving</caption>
                    <thead>
                      <tr>
                        <th scope="col">Option</th>
                        <th scope="col">Principal contributed</th>
                        <th scope="col">Interest saved or earned</th>
                        <th scope="col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row) => (
                        <tr key={row.name}>
                          <th scope="row">{row.name}</th>
                          <td className={dataCell}>
                            {formatCurrency(row["Principal Contributed"])}
                          </td>
                          <td className={dataCell}>
                            {formatCurrency(
                              "Interest Saved" in row
                                ? row["Interest Saved"]
                                : row["Interest Earned (Net)"],
                            )}
                          </td>
                          <td className={dataCell}>{formatCurrency(row.Total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                summary={`Over ${actualHorizon} years, ${
                  isOverpayBetter ? "overpaying the mortgage" : "saving the money"
                } gives a total ${formatCurrency(difference)} higher in this estimate. Overpaying is worth ${formatCurrency(debtReduction)} and saving is worth ${formatCurrency(savingsBalance)}.`}
                hideTitle
                title="Overpay or save comparison"
              >
                <div className={chartWrapper}>
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke={chartColor("grid")}
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} />
                      <YAxis
                        axisLine={false}
                        fontSize={11}
                        tickFormatter={(val: number) => formatAxisCurrency(val)}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipContentStyle}
                        formatter={(value) => formatCurrency(Number(value))}
                        itemStyle={tooltipItemStyle}
                        labelStyle={tooltipLabelStyle}
                      />
                      <Bar
                        dataKey="Principal Contributed"
                        fill={chartColor("primary")}
                        isAnimationActive={!reducedMotion}
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                      <Bar
                        dataKey={isOverpayBetter ? "Interest Saved" : "Interest Earned (Net)"}
                        fill={chartColor("wealth")}
                        isAnimationActive={!reducedMotion}
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartFigure>

              <KpiStrip columns={2}>
                <KpiCard
                  label="Overpayment value"
                  subtext={
                    <span className={kpiNote}>
                      Includes {formatCurrency(mortgageInterestSaved)} interest saved (estimate).
                    </span>
                  }
                  value={<Money size="lg" value={debtReduction} />}
                />
                <KpiCard
                  label="Savings value"
                  subtext={
                    <span className={kpiNote}>
                      Includes {formatCurrency(savingsInterestEarned)} net interest earned
                      (estimate).
                    </span>
                  }
                  value={<Money size="lg" value={savingsBalance} />}
                />
              </KpiStrip>
            </>
          ) : (
            <EmptyState
              headingLevel="h3"
              icon={<Icon icon={Info} size="lg" />}
              description="Add your mortgage balance, interest rate and remaining term to compare overpaying with saving."
              id="overpay-compare-not-set"
              size="sm"
              title="Mortgage details not set"
            />
          )}

          <div className={noteRow}>
            <Icon className={noteIcon} icon={Info} size="sm" />
            <p className={noteText}>
              <strong>Note:</strong> Interest you avoid paying on a mortgage is not taxed and does
              not depend on market returns. Savings interest is subject to tax if it exceeds your
              Personal Savings Allowance (unless in an ISA). Always keep an emergency fund of liquid
              savings before making illiquid mortgage overpayments.
            </p>
          </div>
        </>
      )}
    </Card>
  );

  return (
    <SimulatorSplitLayout
      content={content}
      contentLabel="Overpay or save results"
      controls={controls}
      controlsLabel="Savings parameters"
    />
  );
};
