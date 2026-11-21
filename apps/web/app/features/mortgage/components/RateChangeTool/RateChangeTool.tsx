import {
  compareMortgageRates,
  estimateMortgageAtFixEnd,
  fixedRateEnd,
} from "@flump/finance-engine";
import { ResultBlock, SimulatorSplitLayout, SliderField } from "@repo/ui";
import { type FC, useEffect, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  basisText,
  comparisonLabel,
  comparisonList,
  comparisonRow,
  comparisonValue,
  controlsColumn,
  outcomeColumn,
} from "./RateChangeTool.styles";

export interface RateChangeToolProps {
  loanGbp: number | null;
  annualRatePct: number | null;
  termYears: number | null;
  deltaPct?: number;
  mortgageType?: "repayment" | "interest-only";
  fixEndDate?: string | null;
  currentMonthlyPaymentGbp?: number | null;
  mode?: "new-loan" | "saved-mortgage";
  referenceDate?: Date;
  onLoanChange?: (value: number | null) => void;
  onRateChange?: (value: number | null) => void;
  onDeltaChange?: (value: number) => void;
}

const rateFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

function formatMonthYear(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * Compares monthly mortgage payments at the current/chosen rate, plus N percentage points, and
 * minus N percentage points (floored at 0%). When a future `fixEndDate` is present, projects the
 * balance to the fix-end date via `estimateMortgageAtFixEnd` (E39 sections 4c, 6, 10a MA5).
 */
export const RateChangeTool: FC<RateChangeToolProps> = ({
  loanGbp,
  annualRatePct,
  termYears,
  deltaPct: controlledDeltaPct,
  mortgageType = "repayment",
  fixEndDate = null,
  currentMonthlyPaymentGbp = null,
  mode = "new-loan",
  referenceDate = new Date(),
  onLoanChange,
  onRateChange,
  onDeltaChange,
}) => {
  const { formatCurrency } = useFormatCurrency();

  const [localLoan, setLocalLoan] = useState<number | null>(loanGbp);
  const [localRate, setLocalRate] = useState<number | null>(annualRatePct);
  const [localDelta, setLocalDelta] = useState<number>(controlledDeltaPct ?? 1);

  useEffect(() => {
    setLocalLoan(loanGbp);
  }, [loanGbp]);

  useEffect(() => {
    setLocalRate(annualRatePct);
  }, [annualRatePct]);

  useEffect(() => {
    if (controlledDeltaPct !== undefined) setLocalDelta(controlledDeltaPct);
  }, [controlledDeltaPct]);

  const effectiveLoan = onLoanChange ? loanGbp : localLoan;
  const effectiveRate = onRateChange ? annualRatePct : localRate;
  const effectiveDelta =
    onDeltaChange && controlledDeltaPct !== undefined ? controlledDeltaPct : localDelta;

  const setLoan = (value: number | null) => {
    setLocalLoan(value);
    onLoanChange?.(value);
  };
  const setRate = (value: number | null) => {
    setLocalRate(value);
    onRateChange?.(value);
  };
  const setDelta = (value: number) => {
    setLocalDelta(value);
    onDeltaChange?.(value);
  };

  const fixFact = useMemo(
    () => (fixEndDate ? fixedRateEnd(fixEndDate, referenceDate) : null),
    [fixEndDate, referenceDate],
  );

  const hasValidInputs =
    effectiveLoan !== null &&
    effectiveLoan > 0 &&
    effectiveRate !== null &&
    effectiveRate >= 0 &&
    (mortgageType === "interest-only" || (termYears !== null && termYears > 0));

  const termMonths =
    termYears !== null && termYears > 0
      ? Math.round(termYears * 12)
      : mortgageType === "interest-only"
        ? 12
        : 0;

  const calculation = useMemo(() => {
    if (!hasValidInputs || effectiveLoan === null || effectiveRate === null) return null;

    if (
      fixFact &&
      !fixFact.ended &&
      fixFact.monthsRemaining > 0 &&
      termMonths > fixFact.monthsRemaining
    ) {
      const fixResult = estimateMortgageAtFixEnd({
        balanceGbp: effectiveLoan,
        currentAnnualRatePct: effectiveRate,
        remainingTermMonths: termMonths,
        monthsUntilFixEnd: fixFact.monthsRemaining,
        currentMonthlyPaymentGbp,
        comparisonAnnualRatePct: effectiveRate,
        deltaPct: effectiveDelta,
        repaymentType: mortgageType,
      });
      return {
        rates: fixResult.rates,
        balanceAtFixEndGbp: fixResult.balanceAtFixEndGbp,
        fixEndLabel: formatMonthYear(fixFact.date),
      };
    }

    return {
      rates: compareMortgageRates({
        loanGbp: effectiveLoan,
        annualRatePct: effectiveRate,
        termMonths,
        deltaPct: effectiveDelta,
        repaymentType: mortgageType,
      }),
      balanceAtFixEndGbp: null,
      fixEndLabel: null,
    };
  }, [
    hasValidInputs,
    effectiveLoan,
    effectiveRate,
    fixFact,
    termMonths,
    currentMonthlyPaymentGbp,
    effectiveDelta,
    mortgageType,
  ]);

  const loanSliderMax = Math.max(500000, Math.ceil((effectiveLoan ?? 200000) / 50000) * 100000);
  const deltaUnit = effectiveDelta === 1 ? "point" : "points";

  const controls = (
    <div className={controlsColumn()}>
      {mode === "new-loan" ? (
        <>
          <SliderField
            format="currency"
            label="Loan amount"
            max={loanSliderMax}
            min={0}
            step={5000}
            value={effectiveLoan}
            onChange={(v) => setLoan(v)}
            onClear={() => setLoan(null)}
          />
          <SliderField
            format="percent"
            fractionDigits={2}
            label="Interest rate"
            max={12}
            min={0}
            step={0.05}
            value={effectiveRate}
            onChange={(v) => setRate(v)}
            onClear={() => setRate(null)}
          />
        </>
      ) : hasValidInputs && effectiveLoan !== null && effectiveRate !== null ? (
        <p className={basisText}>
          Starting from {formatCurrency(effectiveLoan)} at {rateFormat.format(effectiveRate)}%
          {fixFact && !fixFact.ended && formatMonthYear(fixFact.date)
            ? `, fixed until ${formatMonthYear(fixFact.date)}`
            : ""}
          .
        </p>
      ) : null}

      <SliderField
        format="percent"
        fractionDigits={2}
        helperText="Shows payments if rates rise or fall by this amount."
        label="Rate change, in percentage points"
        max={5}
        min={0.25}
        step={0.25}
        value={effectiveDelta}
        onChange={(v) => setDelta(v)}
      />
    </div>
  );

  const rates = calculation?.rates;
  const noteText =
    calculation?.fixEndLabel && calculation.balanceAtFixEndGbp !== null
      ? `Starting from your estimated balance of ${formatCurrency(Math.round(calculation.balanceAtFixEndGbp))} when your fixed rate ends in ${calculation.fixEndLabel}.`
      : hasValidInputs && termYears !== null && termYears > 0
        ? `Over ${rateFormat.format(termYears)} years, ${mortgageType === "interest-only" ? "interest-only" : "repayment"}.`
        : undefined;

  return (
    <SimulatorSplitLayout
      controls={controls}
      controlsSpan={5}
      content={
        <div className={outcomeColumn()}>
          <ResultBlock
            emptyPrompt="Add a loan amount, interest rate and term to see how rate changes affect the payment."
            figure={rates ? formatCurrency(Math.round(rates.baseMonthlyPaymentGbp)) : null}
            id="rate-change-result"
            label={
              rates ? `Payment at ${rateFormat.format(rates.baseRatePct)}%` : "Monthly payment"
            }
            note={noteText}
          />
          {rates ? (
            <dl
              className={comparisonList}
              data-testid="rate-change-comparisons"
              id="rate-change-comparisons"
            >
              <div className={comparisonRow}>
                <dt className={comparisonLabel}>
                  Payment at {rateFormat.format(rates.higherRatePct)}%,{" "}
                  {rateFormat.format(rates.deltaPct)} {deltaUnit} higher
                </dt>
                <dd className={comparisonValue}>
                  {formatCurrency(Math.round(rates.higherMonthlyPaymentGbp))} (+
                  {formatCurrency(Math.round(rates.higherDeltaMonthlyGbp))})
                </dd>
              </div>
              <div className={comparisonRow}>
                <dt className={comparisonLabel}>
                  Payment at {rateFormat.format(rates.lowerRatePct)}%,{" "}
                  {rateFormat.format(rates.deltaPct)} {deltaUnit} lower
                </dt>
                <dd className={comparisonValue}>
                  {formatCurrency(Math.round(rates.lowerMonthlyPaymentGbp))} (
                  {rates.lowerDeltaMonthlyGbp === 0
                    ? "£0"
                    : `\u2212${formatCurrency(Math.abs(Math.round(rates.lowerDeltaMonthlyGbp)))}`}
                  )
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      }
    />
  );
};
