import { calculateBudgetLoanEstimate, isMortgageRateTableStale } from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  FormField,
  Icon,
  ResultBlock,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatEstimate } from "~/utils/roundEstimate";
import {
  controlsColumn,
  depositPanel,
  depositToggleRow,
  staleNotice,
} from "./LoanFromPaymentTool.styles";

export interface LoanFromPaymentToolProps {
  monthlyPaymentGbp: number | null;
  annualRatePct: number | null;
  termYears: number;
  depositGbp: number | null;
  buyingCostsGbp: number | null;
  onMonthlyPaymentChange: (value: number | null) => void;
  onAnnualRateChange: (value: number | null) => void;
  onTermYearsChange: (value: number) => void;
  onDepositChange: (value: number | null) => void;
  onBuyingCostsChange: (value: number | null) => void;
  /** Injected date for deterministic stale-rate checks in tests and stories. */
  referenceDate?: Date;
}

const rateFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/**
 * Estimates a repayment loan size from a monthly payment, interest rate (or November 2026 LTV
 * default band when a deposit is given), and term in years (E39 sections 4a, 5, 6, 10a MA5).
 */
export const LoanFromPaymentTool: FC<LoanFromPaymentToolProps> = ({
  monthlyPaymentGbp,
  annualRatePct,
  termYears,
  depositGbp,
  buyingCostsGbp,
  onMonthlyPaymentChange,
  onAnnualRateChange,
  onTermYearsChange,
  onDepositChange,
  onBuyingCostsChange,
  referenceDate = new Date(),
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [depositOpen, setDepositOpen] = useState(
    () =>
      (depositGbp !== null && depositGbp > 0) || (buyingCostsGbp !== null && buyingCostsGbp > 0),
  );

  const result = useMemo(
    () =>
      calculateBudgetLoanEstimate({
        monthlyPaymentGbp: monthlyPaymentGbp ?? 0,
        termMonths: Math.max(0, Math.round(termYears * 12)),
        annualRatePct,
        depositGbp,
        buyingCostsGbp,
      }),
    [monthlyPaymentGbp, termYears, annualRatePct, depositGbp, buyingCostsGbp],
  );

  const isStale = useMemo(() => isMortgageRateTableStale(referenceDate), [referenceDate]);
  const matchedBand = annualRatePct === null ? result.matchedRateBand : null;
  const usingLtvBand = matchedBand !== null;
  const above90LtvWithoutRate =
    annualRatePct === null &&
    result.netDepositGbp !== null &&
    result.netDepositGbp > 0 &&
    result.matchedRateBand === null &&
    (monthlyPaymentGbp ?? 0) > 0;

  const rateHelperText = matchedBand
    ? `Using ${rateFormat.format(matchedBand.lowAnnualRatePct)}% to ${rateFormat.format(matchedBand.highAnnualRatePct)}%. Assumption: rates seen in November 2026 for this loan to value. You can change it.`
    : above90LtvWithoutRate
      ? "No default rate above 90% loan to value. Enter an interest rate."
      : "Assumption: one rate for the whole term.";

  const paymentSliderMax = Math.max(5000, Math.ceil((monthlyPaymentGbp ?? 1500) / 500) * 1000);

  let figureText: string | null = null;
  if (result.loanGbp !== null) {
    figureText = formatEstimate(result.loanGbp);
  } else if (result.lowLoanGbp !== null && result.highLoanGbp !== null) {
    figureText = `${formatEstimate(result.lowLoanGbp)} to ${formatEstimate(result.highLoanGbp)}`;
  }

  let depositRow: { label: string; value: string } | undefined;
  if (result.netDepositGbp !== null && result.netDepositGbp > 0) {
    if (result.propertyPriceGbp !== null && result.ltvPct !== null) {
      depositRow = {
        label: `With a ${formatCurrency(result.netDepositGbp)} deposit`,
        value: `Property price ${formatEstimate(result.propertyPriceGbp)}, loan to value ${Math.round(result.ltvPct)}%`,
      };
    } else if (
      result.lowPropertyPriceGbp !== null &&
      result.highPropertyPriceGbp !== null &&
      result.lowLtvPct !== null &&
      result.highLtvPct !== null
    ) {
      depositRow = {
        label: `With a ${formatCurrency(result.netDepositGbp)} deposit`,
        value: `Property price ${formatEstimate(result.lowPropertyPriceGbp)} to ${formatEstimate(result.highPropertyPriceGbp)}, loan to value ${Math.round(result.lowLtvPct)}% to ${Math.round(result.highLtvPct)}%`,
      };
    }
  }

  const emptyPrompt = !(monthlyPaymentGbp && monthlyPaymentGbp > 0)
    ? "Enter a monthly payment to see an estimated loan."
    : above90LtvWithoutRate
      ? "No default rate above 90% loan to value. Enter an interest rate."
      : "Enter an interest rate or add a deposit to see an estimated loan.";

  const controls = (
    <div className={controlsColumn()}>
      <SliderField
        format="currency"
        label="Monthly payment"
        max={paymentSliderMax}
        min={0}
        step={25}
        value={monthlyPaymentGbp}
        onChange={(v) => onMonthlyPaymentChange(v)}
        onClear={() => onMonthlyPaymentChange(null)}
      />

      <div>
        <SliderField
          format="percent"
          fractionDigits={2}
          helperText={rateHelperText}
          label="Interest rate"
          max={12}
          min={0}
          step={0.05}
          value={annualRatePct}
          onChange={(v) => onAnnualRateChange(v)}
          onClear={() => onAnnualRateChange(null)}
        />
        {usingLtvBand && isStale ? (
          <p className={staleNotice} data-testid="stale-rate-notice" id="stale-rate-notice">
            These rates are from November 2026, more than six months ago. You can type a current
            rate.
          </p>
        ) : null}
      </div>

      <SliderField
        format="number"
        label="Term in years"
        max={40}
        min={5}
        step={1}
        unitSuffix=" years"
        value={termYears}
        onChange={(v) => onTermYearsChange(v)}
      />

      <div className={depositToggleRow}>
        <Button
          aria-expanded={depositOpen}
          size="sm"
          variant="outline"
          onClick={() => setDepositOpen((prev) => !prev)}
        >
          Deposit and buying costs
          <Icon aria-hidden icon={depositOpen ? ChevronUp : ChevronDown} size="sm" />
        </Button>

        {depositOpen ? (
          <div className={depositPanel}>
            <FormField label="Deposit">
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  placeholder="0"
                  value={depositGbp}
                  onValueChange={onDepositChange}
                />
              )}
            </FormField>
            <FormField
              hint="Taken off your deposit before working out property price and loan to value."
              label="Other buying costs"
            >
              {(field) => (
                <CurrencyInput
                  {...controlProps(field)}
                  placeholder="0"
                  value={buyingCostsGbp}
                  onValueChange={onBuyingCostsChange}
                />
              )}
            </FormField>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <SimulatorSplitLayout
      controls={controls}
      controlsSpan={5}
      content={
        <ResultBlock
          emptyPrompt={emptyPrompt}
          figure={figureText}
          id="loan-from-payment-result"
          label="Estimated loan for this payment"
          note={
            figureText
              ? `Repayment mortgage over ${termYears} years, one rate for the whole term, no fees.`
              : undefined
          }
          row={depositRow}
        />
      }
    />
  );
};
