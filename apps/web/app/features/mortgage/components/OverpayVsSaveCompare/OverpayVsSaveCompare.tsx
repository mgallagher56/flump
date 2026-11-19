import { compareMortgageOverpayVsSave } from "@flump/finance-engine";
import {
  ChartFigure,
  CollapsibleDrawer,
  chartColor,
  controlProps,
  FormField,
  formatAxisCurrency,
  InfoTip,
  Num,
  ResultBlock,
  Select,
  SimulatorSplitLayout,
  SliderField,
  Th,
  useTableSort,
} from "@repo/ui";
import { type FC, useId, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, chartBarCursorProps } from "~/features/charts";
import { OVERPAYMENT_RANGE } from "~/features/mortgage/components/OverpaymentSimulator";
import { rateFractionDigits } from "~/features/mortgage/mortgageFormat";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { usePrefersReducedMotion } from "~/hooks/usePrefersReducedMotion";
import {
  chartWrapper,
  controlPanel,
  dataCell,
  dataTable,
  netRateLine,
  resultsBody,
} from "./OverpayVsSaveCompare.styles";

/** Bars read as filled swatches in the tooltip, keyed by each bar's dataKey. */
const BAR_SWATCHES = {
  "Money paid in": "area",
  "Interest saved": "area",
  "Interest earned after tax": "area",
} as const;

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
  const uid = useId().replace(/:/g, "");
  const savingsRateNoteId = `overpay-compare-rate-note-${uid}`;
  const horizonNoteId = `overpay-compare-years-note-${uid}`;
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

  // Two options side by side: sorting only, in the order shown until a header sorts them.
  const interestOf = (row: (typeof chartData)[number]) =>
    "Interest saved" in row ? row["Interest saved"] : row["Interest earned after tax"];
  const { sortedRows, getSortProps } = useTableSort({
    rows: chartData,
    columns: {
      option: { value: (r) => r.name },
      paidIn: { value: (r) => r["Money paid in"], firstDirection: "desc" },
      interest: { value: interestOf, firstDirection: "desc" },
      total: { value: (r) => r.Total, firstDirection: "desc" },
    },
  });

  const years = `${actualHorizon} ${actualHorizon === 1 ? "year" : "years"}`;
  const outcomeText =
    difference < 1
      ? `Both give about the same over ${years} (estimate)`
      : `${isOverpayBetter ? "Overpaying the mortgage" : "Saving the money"} gives more over ${years} (estimate)`;

  // Three inputs in view (the amount, the savings rate and its tax). The years compared are named
  // in the result's label, so their slider waits behind a quiet toggle.
  const controls = (
    <div className={controlPanel()}>
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
        describedBy={savingsRateNoteId}
        format="percent"
        fractionDigits={rateFractionDigits(savingsRate)}
        label="Savings interest rate"
        labelAddon={
          <InfoTip
            descriptionId={savingsRateNoteId}
            label="About the savings interest rate"
            term="Savings interest rate"
          >
            An assumption you choose. Change it to match your account.
          </InfoTip>
        }
        max={12}
        min={0.1}
        step={0.05}
        value={savingsRate}
        onChange={setSavingsRate}
      />

      <FormField label="Tax on your savings interest">
        {(field) => (
          <>
            <Select
              {...controlProps(field)}
              aria-describedby={
                [field.describedBy, "overpay-compare-net-rate"].filter(Boolean).join(" ") ||
                undefined
              }
              options={TAX_OPTIONS}
              value={taxBracket}
              onChange={(e) => setTaxBracket(e.target.value)}
            />
            {/* The tax choice's effect, kept beside it: a figure, not supporting text. */}
            <p
              className={netRateLine}
              data-testid="overpay-compare-net-rate"
              id="overpay-compare-net-rate"
            >
              After tax:{" "}
              <Num
                fractionDigits={rateFractionDigits(netSavingsRate)}
                kind="percent"
                size="sm"
                value={netSavingsRate}
              />
            </p>
          </>
        )}
      </FormField>

      <CollapsibleDrawer title="Show the years compared" variant="quiet">
        <SliderField
          describedBy={horizonNoteId}
          label="Years to compare"
          labelAddon={
            <InfoTip
              descriptionId={horizonNoteId}
              label="About the years to compare"
              term="Years to compare"
            >
              Whole years, up to the years left on your mortgage
            </InfoTip>
          }
          max={horizonMax}
          min={1}
          step={1}
          unitSuffix="years"
          value={horizonValue}
          onChange={setHorizonYears}
        />
      </CollapsibleDrawer>
    </div>
  );

  const content = (
    <div className={resultsBody()}>
      {!inputsKnown || overpayment <= 0 ? (
        // The same one result card, empty: it says what to add, in place.
        <ResultBlock
          emptyPrompt={
            inputsKnown
              ? "Choose an amount each month to compare overpaying with saving."
              : "Add your mortgage balance, interest rate and years left to compare overpaying with saving."
          }
          figure={null}
          hideLabel
          id="overpay-compare-outcome"
          label="Overpaying compared with saving"
        />
      ) : (
        <>
          {/* The tool's one result card (E17 5A). The label names the option with the higher
              total, so no extra sentence restates it; one option's worth is the row and the
              other's is the sentence. What the estimate assumes sits behind the info button. */}
          <ResultBlock
            figure={formatCurrency(difference)}
            id="overpay-compare-outcome"
            label={outcomeText}
            labelAddon={
              <InfoTip label="About this estimate" term="What this estimate assumes">
                Interest you do not pay on the mortgage is not taxed, and savings interest is taxed
                at the rate you chose. Money overpaid on a mortgage usually cannot be taken back
                out.
              </InfoTip>
            }
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
                    <Th bare scope="col" {...getSortProps("option")}>
                      Option
                    </Th>
                    <Th bare scope="col" {...getSortProps("paidIn")}>
                      Money paid in
                    </Th>
                    <Th bare scope="col" {...getSortProps("interest")}>
                      Interest saved or earned after tax
                    </Th>
                    <Th bare scope="col" {...getSortProps("total")}>
                      Total
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">{row.name}</th>
                      <td className={dataCell}>{formatCurrency(row["Money paid in"])}</td>
                      <td className={dataCell}>{formatCurrency(interestOf(row))}</td>
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
                    content={<ChartTooltip swatches={BAR_SWATCHES} />}
                    cursor={chartBarCursorProps}
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
      )}
    </div>
  );

  return (
    <SimulatorSplitLayout
      content={content}
      contentLabel="Overpay or save results"
      controls={controls}
      controlsLabel="Savings assumptions"
      controlsSpan={4}
    />
  );
};
