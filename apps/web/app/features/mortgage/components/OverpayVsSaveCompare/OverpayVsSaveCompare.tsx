import { compareMortgageOverpayVsSave } from "@flump/finance-engine";
import {
  ChartFigure,
  chartColor,
  controlProps,
  FormField,
  formatAxisCurrency,
  Num,
  ResultBlock,
  Select,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartBarCursorProps } from "~/features/charts";
import { OVERPAYMENT_RANGE } from "~/features/mortgage/components/OverpaymentSimulator";
import { rateFractionDigits } from "~/features/mortgage/mortgageFormat";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";
import {
  chartWrapper,
  controlPanel,
  dataCell,
  dataTable,
  noteText,
  outcomeNote,
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
  /** The monthly amount compared. Shared with the Overpay tab through the scenario state. */
  overpayment: number;
  /** Sets the shared overpayment, so this tab and the Overpay tab always show one amount. */
  onOverpaymentChange: (value: number) => void;
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
  onOverpaymentChange,
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

  // Comparison simulation via the finance engine
  const comparisonData = useMemo(
    () =>
      compareMortgageOverpayVsSave({
        loanAmount,
        annualRatePct: interestRate,
        termYears: remainingTerm,
        overpayment,
        netSavingsRatePct: netSavingsRate,
        horizonYears: Math.min(horizonYears, horizonMax),
        mortgageType,
      }),
    [
      loanAmount,
      interestRate,
      remainingTerm,
      overpayment,
      netSavingsRate,
      horizonYears,
      horizonMax,
      mortgageType,
    ],
  );

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
  const outcomeText =
    difference < 1
      ? `Both give about the same over ${years} (estimate)`
      : `${isOverpayBetter ? "Overpaying the mortgage" : "Saving the money"} gives more over ${years} (estimate)`;

  const controls = (
    <div className={controlPanel()}>
      <p className={panelHint}>
        Assumptions you can change: the amount each month, your savings rate and the tax on your
        savings interest.
      </p>

      <SliderField
        format="currency"
        label="Amount each month"
        max={OVERPAYMENT_RANGE.max}
        min={OVERPAYMENT_RANGE.min}
        step={OVERPAYMENT_RANGE.step}
        value={overpayment}
        onChange={onOverpaymentChange}
      />

      <SliderField
        format="percent"
        fractionDigits={rateFractionDigits(savingsRate)}
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

      <dl className={rateList}>
        <div className={rateRow}>
          <dt>Savings interest rate after tax</dt>
          <dd>
            <Num
              data-testid="overpay-compare-net-rate"
              fractionDigits={rateFractionDigits(netSavingsRate)}
              id="overpay-compare-net-rate"
              kind="percent"
              size="sm"
              value={netSavingsRate}
            />
          </dd>
        </div>
      </dl>

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
      {inputsKnown && overpayment <= 0 ? (
        <p className={outcomeNote} id="overpay-compare-no-amount">
          Choose an amount each month to compare overpaying with saving.
        </p>
      ) : inputsKnown ? (
        <>
          {/* The zone's one result card (E17 5A). The label names the option with the higher
              total, so no extra sentence restates it; one option's worth is the row and the
              other's is the sentence. */}
          <ResultBlock
            figure={formatCurrency(difference)}
            id="overpay-compare-outcome"
            label={outcomeText}
            note={`Saving is worth (estimate): ${formatCurrency(savingsBalance)}.`}
            row={{
              label: "Overpaying is worth (estimate)",
              value: formatCurrency(debtReduction),
            }}
          />

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
            showSummary={false}
            title="Overpay or save comparison"
          >
            <div className={chartWrapper}>
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                    cursor={chartBarCursorProps}
                    formatter={(value) => formatCurrency(Number(value))}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                    separator=": "
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
          Add your mortgage balance, interest rate and years left to compare overpaying with saving.
        </p>
      )}

      <p className={noteText}>
        This estimate assumes interest you do not pay on the mortgage is not taxed, and savings
        interest is taxed at the rate you chose above. Money overpaid on a mortgage usually cannot
        be taken back out.
      </p>
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
