import {
  calculateIncomeMultipleRange,
  DEFAULT_INCOME_MULTIPLE_HIGH,
  DEFAULT_INCOME_MULTIPLE_LOW,
} from "@flump/finance-engine";
import {
  Button,
  CurrencyInput,
  controlProps,
  FormField,
  Icon,
  ResultBlock,
  SimulatorSplitLayout,
  SliderField,
  TextInput,
} from "@repo/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type FC, useEffect, useId, useMemo, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatEstimate } from "~/utils/roundEstimate";
import {
  controlsColumn,
  depositPanel,
  depositToggleRow,
  multipleGroup,
  multipleHint,
  multipleInputWrap,
  multipleLabel,
  multipleRow,
  multipleSeparator,
} from "./IncomeMultipleTool.styles";

export interface IncomeMultipleToolProps {
  primaryAnnualIncomeGbp: number | null;
  secondAnnualIncomeGbp: number | null;
  lowMultiple: number;
  highMultiple: number;
  depositGbp: number | null;
  buyingCostsGbp: number | null;
  onPrimaryIncomeChange: (value: number | null) => void;
  onSecondIncomeChange: (value: number | null) => void;
  onLowMultipleChange: (value: number) => void;
  onHighMultipleChange: (value: number) => void;
  onDepositChange: (value: number | null) => void;
  onBuyingCostsChange: (value: number | null) => void;
}

const multipleFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/**
 * Estimates a borrowing range from yearly income before tax, optional second income, and an
 * editable low/high income multiple range (default 4 to 4.5) (E39 sections 4a, 6, 10a MA2).
 */
export const IncomeMultipleTool: FC<IncomeMultipleToolProps> = ({
  primaryAnnualIncomeGbp,
  secondAnnualIncomeGbp,
  lowMultiple,
  highMultiple,
  depositGbp,
  buyingCostsGbp,
  onPrimaryIncomeChange,
  onSecondIncomeChange,
  onLowMultipleChange,
  onHighMultipleChange,
  onDepositChange,
  onBuyingCostsChange,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const hintId = useId();
  const [depositOpen, setDepositOpen] = useState(
    () =>
      (depositGbp !== null && depositGbp > 0) || (buyingCostsGbp !== null && buyingCostsGbp > 0),
  );

  const [lowText, setLowText] = useState(String(lowMultiple));
  const [highText, setHighText] = useState(String(highMultiple));

  useEffect(() => {
    setLowText(String(lowMultiple));
  }, [lowMultiple]);

  useEffect(() => {
    setHighText(String(highMultiple));
  }, [highMultiple]);

  const result = useMemo(
    () =>
      calculateIncomeMultipleRange({
        primaryAnnualIncomeGbp: primaryAnnualIncomeGbp ?? 0,
        secondAnnualIncomeGbp,
        lowMultiple,
        highMultiple,
        depositGbp,
        buyingCostsGbp,
      }),
    [
      primaryAnnualIncomeGbp,
      secondAnnualIncomeGbp,
      lowMultiple,
      highMultiple,
      depositGbp,
      buyingCostsGbp,
    ],
  );

  const incomeMax = Math.max(150000, Math.ceil((primaryAnnualIncomeGbp ?? 50000) / 25000) * 50000);
  const secondIncomeMax = Math.max(
    150000,
    Math.ceil((secondAnnualIncomeGbp ?? 50000) / 25000) * 50000,
  );

  const commitMultiple = (
    raw: string,
    fallback: number,
    onCommit: (v: number) => void,
    resetText: (t: string) => void,
  ) => {
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) {
      onCommit(parsed);
      resetText(String(parsed));
    } else {
      resetText(String(fallback));
    }
  };

  const hasIncome = result.combinedAnnualIncomeGbp > 0;
  const figureText = hasIncome
    ? result.lowLoanGbp === result.highLoanGbp
      ? formatEstimate(result.lowLoanGbp)
      : `${formatEstimate(result.lowLoanGbp)} to ${formatEstimate(result.highLoanGbp)}`
    : null;

  let depositRow: { label: string; value: string } | undefined;
  if (
    hasIncome &&
    result.netDepositGbp !== null &&
    result.netDepositGbp > 0 &&
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

  const controls = (
    <div className={controlsColumn()}>
      <SliderField
        format="currency"
        label="Yearly income before tax"
        max={incomeMax}
        min={0}
        step={1000}
        value={primaryAnnualIncomeGbp}
        onChange={(v) => onPrimaryIncomeChange(v)}
        onClear={() => onPrimaryIncomeChange(null)}
      />

      <SliderField
        format="currency"
        label="Another person's yearly income"
        max={secondIncomeMax}
        min={0}
        step={1000}
        value={secondAnnualIncomeGbp}
        onChange={(v) => onSecondIncomeChange(v)}
        onClear={() => onSecondIncomeChange(null)}
      />

      <div className={multipleGroup}>
        <span className={multipleLabel}>Multiple of yearly income</span>
        <div className={multipleRow}>
          <div className={multipleInputWrap}>
            <TextInput
              aria-describedby={hintId}
              aria-label="Lower multiple of yearly income"
              inputMode="decimal"
              value={lowText}
              onBlur={() =>
                commitMultiple(
                  lowText,
                  lowMultiple || DEFAULT_INCOME_MULTIPLE_LOW,
                  onLowMultipleChange,
                  setLowText,
                )
              }
              onChange={(e) => {
                setLowText(e.target.value);
                const parsed = Number(e.target.value.trim());
                if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) {
                  onLowMultipleChange(parsed);
                }
              }}
            />
          </div>
          <span className={multipleSeparator}>to</span>
          <div className={multipleInputWrap}>
            <TextInput
              aria-describedby={hintId}
              aria-label="Upper multiple of yearly income"
              inputMode="decimal"
              value={highText}
              onBlur={() =>
                commitMultiple(
                  highText,
                  highMultiple || DEFAULT_INCOME_MULTIPLE_HIGH,
                  onHighMultipleChange,
                  setHighText,
                )
              }
              onChange={(e) => {
                setHighText(e.target.value);
                const parsed = Number(e.target.value.trim());
                if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) {
                  onHighMultipleChange(parsed);
                }
              }}
            />
          </div>
        </div>
        <p className={multipleHint} id={hintId}>
          Assumption: 4 to 4.5 times yearly income. Lenders set their own limits and checks. You can
          change these.
        </p>
      </div>

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
          emptyPrompt="Enter yearly income to see an estimated borrowing range."
          figure={figureText}
          id="income-multiple-result"
          label="Estimated borrowing range"
          note={
            hasIncome
              ? `Based on ${formatCurrency(result.combinedAnnualIncomeGbp)} yearly income at ${multipleFormat.format(result.lowMultiple)} to ${multipleFormat.format(result.highMultiple)} times income.`
              : undefined
          }
          row={depositRow}
        />
      }
    />
  );
};
