import { Button, Card, CurrencyInput, FormField, Icon, Money } from "@repo/ui";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import {
  actionRow,
  cardBody,
  cardSubtitle,
  cardTitle,
  fieldsRow,
  resultBlock,
  resultLabel,
  resultUnit,
  resultValue,
} from "./PayRiseCard.styles";

export interface PayRiseCardProps {
  /** Gross pay rise being tried, in pounds a year. */
  salaryIncrease: number;
  /** Extra take-home a month the rise would produce (already computed by the caller). */
  monthlyIncrease: number;
  onSalaryIncreaseChange: (value: number) => void;
  onApplyIncrease: (monthlyIncrease: number) => void;
}

/** "What a pay rise does": a what-if raise and the extra monthly take-home it produces. */
export const PayRiseCard: FC<PayRiseCardProps> = ({
  salaryIncrease,
  monthlyIncrease,
  onSalaryIncreaseChange,
  onApplyIncrease,
}) => (
  <Card padding="lg">
    <div className={cardBody()}>
      <div>
        <h2 className={cardTitle()}>What a pay rise does</h2>
        <p className={cardSubtitle()}>
          Enter a pay rise to see how much more you would take home each month.
        </p>
      </div>
      <div className={fieldsRow()}>
        <FormField label="Pay rise a year (gross)">
          {(field) => (
            <CurrencyInput
              id={field.id}
              aria-describedby={field.describedBy}
              placeholder="0"
              value={salaryIncrease === 0 ? null : salaryIncrease}
              onValueChange={(v) => onSalaryIncreaseChange(v ?? 0)}
            />
          )}
        </FormField>
        <div className={resultBlock()}>
          <span className={resultLabel()}>Extra take-home each month</span>
          <span className={resultValue()}>
            <Money fractionDigits={0} signDisplay="always" size="lg" value={monthlyIncrease} />
            <span className={resultUnit()}>a month</span>
          </span>
        </div>
      </div>
      <div className={actionRow()}>
        <Button variant="outline" onClick={() => onApplyIncrease(monthlyIncrease)}>
          Model this in the savings forecaster
          <Icon icon={ArrowRight} size="sm" />
        </Button>
      </div>
    </div>
  </Card>
);

export default PayRiseCard;
