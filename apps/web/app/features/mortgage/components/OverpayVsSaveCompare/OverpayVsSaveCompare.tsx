import {
  ChartFigure,
  chartColor,
  controlProps,
  FormField,
  formatAxisCurrency,
  Num,
  Select,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";
import {
  chartWrapper,
  controlPanel,
  dataCell,
  dataTable,
  noteText,
  outcomeLabel,
  outcomeNote,
  outcomeValue,
  panelHint,
  rateList,
  rateRow,
  resultsBody,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "./OverpayVsSaveCompare.styles";

export interface OverpayVsSaveCompareProps {
  loanAmount: number;
  interestRate: number; // Mortgage Rate
  remainingTerm: number;
  overpayment: number; // Monthly budget
  mortgageType?: "repayment" | "interest-only";
}

const TAX_OPTIONS = [
  { value: "isa", label: "ISA or other tax-free savings (0% tax)" },
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
      name: "Overpay the mortgage",
      "Money paid in": totalInvested,
      "Interest saved": Math.round(mortgageInterestSaved),
      Total: Math.round(debtReduction),
    },
    {
      name: "Save the money",
      "Money paid in": totalInvested,
      "Interest earned after tax": Math.round(savingsInterestEarned),
      Total: Math.round(savingsBalance),
    },
  ];

  const years = `${actualHorizon} ${actualHorizon === 1 ? "year" : "years"}`;

  const controls = (
    <div className={controlPanel()}>
      <p className={panelHint}>
        Assumptions you can change: your savings rate and the tax on your savings interest.
      </p>

      <SliderField
        format="percent"
        fractionDigits={2}
        helperText="Assumption: change this to match your account."
        label="Savings interest rate"
        max={12}
        min={0.1}
        step={0.05}
        value={savingsRate}
        onChange={setSavingsRate}
      />

      <FormField label="Tax on your savings interest">
        {(field) => (
          <Select
            {...controlProps(field)}
            options={TAX_OPTIONS}
            value={taxBracket}
            onChange={(e) => setTaxBracket(e.target.value)}
          />
        )}
      </FormField>

      <SliderField
        helperText="Assumption: whole years to compare, up to your remaining term."
        label="Years to compare"
        max={horizonMax}
        min={1}
        step={1}
        unitSuffix="years"
        value={horizonValue}
        onChange={setHorizonYears}
      />
    </div>
  );

  const content = (
    <div className={resultsBody()}>
      <p className={panelHint}>
        {overpayment > 0 && inputsKnown
          ? `Estimate over ${years}, with ${formatCurrency(overpayment)} a month.`
          : "Estimate based on the figures you have set."}
      </p>

      {overpayment <= 0 ? (
        <div id="overpay-compare-no-budget">
          <p className={outcomeLabel}>No overpayment set</p>
          <p className={outcomeNote}>
            Set a monthly overpayment on the &ldquo;Overpay&rdquo; tab to compare the two.
          </p>
        </div>
      ) : (
        <>
          <dl className={rateList}>
            <div className={rateRow}>
              <dt>Mortgage interest rate</dt>
              <dd>
                <Num
                  data-testid="overpay-compare-mortgage-rate"
                  fractionDigits={2}
                  id="overpay-compare-mortgage-rate"
                  kind="percent"
                  size="sm"
                  value={interestRate > 0 ? interestRate : null}
                />
              </dd>
            </div>
            <div className={rateRow}>
              <dt>Savings interest rate after tax</dt>
              <dd>
                <Num
                  data-testid="overpay-compare-net-rate"
                  fractionDigits={2}
                  id="overpay-compare-net-rate"
                  kind="percent"
                  size="sm"
                  value={netSavingsRate}
                />
              </dd>
            </div>
          </dl>

          {inputsKnown ? (
            <>
              <div data-testid="overpay-compare-outcome" id="overpay-compare-outcome">
                <p className={outcomeLabel}>Difference over {years} (estimate)</p>
                <p className={outcomeValue}>{formatCurrency(difference)}</p>
                <p className={outcomeNote}>
                  In this estimate,{" "}
                  {isOverpayBetter ? "overpaying the mortgage" : "saving the money"} gives the
                  higher total.
                </p>
              </div>

              <dl className={rateList}>
                <div className={rateRow}>
                  <dt>Overpaying is worth (estimate)</dt>
                  <dd>{formatCurrency(debtReduction)}</dd>
                </div>
                <div className={rateRow}>
                  <dt>Saving is worth (estimate)</dt>
                  <dd>{formatCurrency(savingsBalance)}</dd>
                </div>
              </dl>

              <ChartFigure
                dataTable={
                  <table className={dataTable}>
                    <caption>Overpaying the mortgage compared with saving</caption>
                    <thead>
                      <tr>
                        <th scope="col">Option</th>
                        <th scope="col">Money paid in</th>
                        <th scope="col">Interest saved or earned after tax</th>
                        <th scope="col">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row) => (
                        <tr key={row.name}>
                          <th scope="row">{row.name}</th>
                          <td className={dataCell}>{formatCurrency(row["Money paid in"])}</td>
                          <td className={dataCell}>
                            {formatCurrency(
                              "Interest saved" in row
                                ? row["Interest saved"]
                                : row["Interest earned after tax"],
                            )}
                          </td>
                          <td className={dataCell}>{formatCurrency(row.Total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                summary={`Over ${years}, ${
                  isOverpayBetter ? "overpaying the mortgage" : "saving the money"
                } gives a total ${formatCurrency(difference)} higher in this estimate.`}
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
                        dataKey="Money paid in"
                        fill={chartColor("primary")}
                        isAnimationActive={!reducedMotion}
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                      <Bar
                        dataKey={isOverpayBetter ? "Interest saved" : "Interest earned after tax"}
                        fill={chartColor("wealth")}
                        isAnimationActive={!reducedMotion}
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartFigure>
            </>
          ) : (
            <p className={outcomeNote} id="overpay-compare-not-set">
              Add your mortgage balance, interest rate and years left to compare overpaying with
              saving.
            </p>
          )}

          <p className={noteText}>
            This estimate assumes interest you do not pay on the mortgage is not taxed, and savings
            interest is taxed at the rate you chose above. Money overpaid on a mortgage usually
            cannot be taken back out.
          </p>
        </>
      )}
    </div>
  );

  return (
    <SimulatorSplitLayout
      content={content}
      contentLabel="Overpay or save results"
      controls={controls}
      controlsLabel="Savings assumptions"
    />
  );
};
