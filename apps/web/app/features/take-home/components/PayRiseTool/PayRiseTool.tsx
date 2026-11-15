import {
  Button,
  formatMoney,
  Icon,
  ResultBlock,
  SimulatorSplitLayout,
  SliderField,
} from "@repo/ui";
import { ArrowRight } from "lucide-react";
import type { FC } from "react";
import { actionRow, outcome, outcomeUnit } from "./PayRiseTool.styles";

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

/** "A pay rise": one input and one outcome, in the zone's one result card (E17 5A). */
export const PayRiseTool: FC<PayRiseToolProps> = ({
  salaryIncrease,
  monthlyIncrease,
  onSalaryIncreaseChange,
  onApplyIncrease,
}) => (
  <SimulatorSplitLayout
    content={
      <div className={outcome()}>
        <ResultBlock
          figure={
            <>
              <span>
                {formatMoney(monthlyIncrease, { fractionDigits: 0, signDisplay: "always" }).text}
              </span>{" "}
              <span className={outcomeUnit()}>a month</span>
            </>
          }
          id="pay-rise-outcome"
          label="Change in take-home pay"
        />
        <div className={actionRow()}>
          <Button size="sm" variant="outline" onClick={() => onApplyIncrease(monthlyIncrease)}>
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
