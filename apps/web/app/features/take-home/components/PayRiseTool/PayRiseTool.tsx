import { Button, Icon, Money, SimulatorSplitLayout, SliderField } from "@repo/ui";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { actionRow, outcome, outcomeLabel, outcomeUnit, outcomeValue } from "./PayRiseTool.styles";

/** The slider's range: £0 to £20,000 a year, in £500 steps. The pill takes any figure in range. */
export const PAY_RISE_MAX = 20_000;
export const PAY_RISE_STEP = 500;

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
      // The same control as "The next £1,000": a slider with an editable value pill.
      <SliderField
        format="currency"
        helperText="Move the slider or type a figure to see the estimated change in your monthly take-home pay."
        label="Pay rise a year, before tax"
        max={PAY_RISE_MAX}
        min={0}
        step={PAY_RISE_STEP}
        value={salaryIncrease}
        onChange={onSalaryIncreaseChange}
      />
    }
    controlsLabel="Illustration inputs"
  />
);

export default PayRiseTool;
