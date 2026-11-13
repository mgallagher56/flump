import type { AvalancheVsSnowballComparison } from "@flump/finance-engine";
import { Button, Icon, SliderField, VisuallyHidden } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Minus, Snowflake, TrendingDown } from "lucide-react";
import { type FC, useId } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  baselineBox,
  cardHeading,
  cardSubtitle,
  impactNote,
  optionFacts,
  optionHeader,
  optionHeadline,
  optionHint,
  strategyGroup,
  strategyOption,
  surplusRow,
  switcherCard,
} from "./PayoffStrategySwitcher.styles";

export interface PayoffStrategySwitcherProps {
  comparison: AvalancheVsSnowballComparison;
  selectedStrategy: "avalanche" | "snowball";
  onSelectStrategy: (strategy: "avalanche" | "snowball") => void;
  extraPayment: number;
  onChangeExtraPayment: (amount: number) => void;
  budgetSurplus?: number;
  className?: string;
}

/** Slider ceiling: at least £1,000, and never below the surplus or the current extra payment. */
const sliderMax = (budgetSurplus: number, extraPayment: number): number =>
  Math.max(1000, Math.ceil(budgetSurplus / 10) * 10, Math.ceil(extraPayment / 10) * 10);

interface OptionResult {
  months: number;
  debtFreeDate: string | null;
  totalInterest: number;
  payoffAchievable?: boolean;
}

export const PayoffStrategySwitcher: FC<PayoffStrategySwitcherProps> = ({
  comparison,
  selectedStrategy,
  onSelectStrategy,
  extraPayment,
  onChangeExtraPayment,
  budgetSurplus = 0,
  className,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const groupName = useId();
  const max = sliderMax(budgetSurplus, extraPayment);
  const matchTarget = Math.min(Math.round(budgetSurplus), max);

  // These are native radios, so arrowing between them checks (and so selects) the next one: that
  // is standard radiogroup behaviour and we keep it rather than rebuilding roving tabindex.
  // Choosing an order only changes the order. It never invents an extra payment: the amount is
  // whatever the user set on the slider, and starts at £0.
  const chooseStrategy = onSelectStrategy;

  const activeResult =
    selectedStrategy === "avalanche" ? comparison.avalanche : comparison.snowball;
  const monthsSaved = Math.max(0, comparison.minimumOnly.months - activeResult.months);
  const interestSaved = Math.max(
    0,
    comparison.minimumOnly.totalInterest - activeResult.totalInterest,
  );

  const impact =
    extraPayment > 0 && monthsSaved > 0
      ? `With ${formatCurrency(extraPayment)} extra a month: debt-free ${monthsSaved} ${
          monthsSaved === 1 ? "month" : "months"
        } sooner and ${formatCurrency(interestSaved)} less interest than minimum payments only.`
      : extraPayment > 0
        ? "At this amount the finish date matches minimum payments only."
        : "No extra payment: this is the minimum payments only timeline.";

  const headline = (result: OptionResult) =>
    result.payoffAchievable === false
      ? "Not cleared within the projection"
      : `Debt-free in ${result.months} ${result.months === 1 ? "month" : "months"}, ${formatCurrency(
          result.totalInterest,
        )} interest`;

  const finishDate = (result: OptionResult) =>
    result.payoffAchievable === false || !result.debtFreeDate ? "Not set" : result.debtFreeDate;

  const options: {
    id: "avalanche" | "snowball";
    label: string;
    hint: string;
    icon: typeof TrendingDown;
    result: OptionResult;
    versusMinimum: number;
  }[] = [
    {
      id: "avalanche",
      label: "Highest rate first (avalanche)",
      hint: "Pays the debt with the highest APR first.",
      icon: TrendingDown,
      result: comparison.avalanche,
      versusMinimum: comparison.interestSavedAvalancheVsMin,
    },
    {
      id: "snowball",
      label: "Smallest balance first (snowball)",
      hint: "Pays the smallest balance first.",
      icon: Snowflake,
      result: comparison.snowball,
      versusMinimum: Math.max(
        0,
        comparison.minimumOnly.totalInterest - comparison.snowball.totalInterest,
      ),
    },
  ];

  return (
    <section aria-labelledby="payoff-order-heading" className={cx(switcherCard(), className)}>
      <div>
        <h3 className={cardHeading} id="payoff-order-heading">
          Payoff order
        </h3>
        <p className={cardSubtitle}>
          Compare how paying highest rate first or smallest balance first changes your finish date
          and interest.
        </p>
      </div>

      <SliderField
        label="Extra payment each month"
        max={max}
        min={0}
        step={10}
        unitPrefix="+£"
        unitSuffix="/mo"
        value={extraPayment}
        onChange={onChangeExtraPayment}
      />

      {budgetSurplus > 0 ? (
        <div className={surplusRow()}>
          <span>Your budget surplus is {formatCurrency(budgetSurplus)} a month.</span>
          {extraPayment !== matchTarget ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onChangeExtraPayment(matchTarget)}
            >
              Match surplus ({formatCurrency(budgetSurplus)})
            </Button>
          ) : null}
        </div>
      ) : null}

      <p className={impactNote()}>{impact}</p>

      <div aria-label="Payoff order" className={strategyGroup()} role="radiogroup">
        {options.map((option) => {
          const checked = selectedStrategy === option.id;
          return (
            <label className={strategyOption({ active: checked })} key={option.id}>
              <VisuallyHidden>
                <input
                  checked={checked}
                  name={groupName}
                  type="radio"
                  onChange={() => chooseStrategy(option.id)}
                />
              </VisuallyHidden>
              <span className={optionHeader()}>
                <Icon icon={option.icon} size="sm" />
                {option.label}
              </span>
              <span className={optionHint}>{option.hint}</span>
              <span className={optionHeadline}>{headline(option.result)}</span>
              <dl className={optionFacts()}>
                <dt>Finish date</dt>
                <dd>{finishDate(option.result)}</dd>
                <dt>Interest vs minimum payments only</dt>
                <dd>{formatCurrency(option.versusMinimum)} lower</dd>
              </dl>
            </label>
          );
        })}
      </div>

      <div className={baselineBox()}>
        <span className={optionHeader()}>
          <Icon icon={Minus} size="sm" />
          Minimum payments only
        </span>
        <span className={optionHeadline}>{headline(comparison.minimumOnly)}</span>
        <dl className={optionFacts()}>
          <dt>Finish date</dt>
          <dd>{finishDate(comparison.minimumOnly)}</dd>
        </dl>
      </div>
    </section>
  );
};

export default PayoffStrategySwitcher;
