import { Button, CurrencyInput, FormField, Icon, Money, SimulatorSplitLayout } from "@repo/ui";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { actionRow, outcome, outcomeLabel, outcomeUnit, outcomeValue } from "./PayRiseTool.styles";

export interface PayRiseToolProps {
  /** Pay rise being tried, before tax, in pounds a year. */
  salaryIncrease: number;
  /** Estimated change in monthly take-home the rise produces (computed by the caller). */
  monthlyIncrease: number;
  onSalaryIncreaseChange: (value: number) => void;
  onApplyIncrease: (monthlyIncrease: number) => void;
}

/** "A pay rise": one input and one outcome, on the ScenarioZone surface (no nested card). */
export const PayRiseTool: FC<PayRiseToolProps> = ({
  salaryIncrease,
  monthlyIncrease,
  onSalaryIncreaseChange,
  onApplyIncrease,
}) => (
  <SimulatorSplitLayout
    content={
      <div className={outcome()} data-testid="pay-rise-outcome" id="pay-rise-outcome">
        <p className={outcomeLabel()}>Change in take-home pay</p>
        <p className={outcomeValue()}>
          <Money fractionDigits={0} signDisplay="always" size="kpi" value={monthlyIncrease} />
          <span className={outcomeUnit()}>a month</span>
        </p>
        <div className={actionRow()}>
          <Button variant="outline" onClick={() => onApplyIncrease(monthlyIncrease)}>
            Model this in savings
            <Icon icon={ArrowRight} size="sm" />
          </Button>
        </div>
      </div>
    }
    contentLabel="Illustration result"
    controls={
      <FormField
        hint="Enter a pay rise to see the estimated change in your monthly take-home pay."
        label="Pay rise a year, before tax"
      >
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
    }
    controlsLabel="Illustration inputs"
  />
);

export default PayRiseTool;
