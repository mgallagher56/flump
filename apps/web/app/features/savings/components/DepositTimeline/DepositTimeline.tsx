import { monthsToTarget } from "@flump/finance-engine";
import { CurrencyInput, controlProps, FormField, SimulatorSplitLayout } from "@repo/ui";
import type { FC } from "react";
import { formatDuration } from "../SavingsForecast/savingsForecast.utils";
import {
  timelineControls,
  timelineNote,
  timelineOutcome,
  timelineResult,
} from "./DepositTimeline.styles";

/** Scenario inputs only. Unknown values stay null (an empty field), never 0. */
// A type alias (not an interface) so it satisfies useScenarioState's record constraint.
export type DepositTimelineValues = {
  targetDeposit: number | null;
  monthlySaving: number | null;
  startingAmount: number | null;
};

export interface DepositTimelineProps {
  values: DepositTimelineValues;
  onChange: <K extends keyof DepositTimelineValues>(
    key: K,
    value: DepositTimelineValues[K],
  ) => void;
}

export const DEPOSIT_EMPTY_TEXT = "Enter a target amount to see an estimate.";

/** The one outcome line for the current inputs. */
export function depositOutcomeText(values: DepositTimelineValues): string {
  if (values.targetDeposit === null || !(values.targetDeposit > 0)) return DEPOSIT_EMPTY_TEXT;
  const result = monthsToTarget({
    target: values.targetDeposit,
    starting: values.startingAmount ?? 0,
    monthly: values.monthlySaving ?? 0,
  });
  if (result.status === "reached") return "Your starting amount already meets this target.";
  if (result.status === "not-reachable") {
    return "With no monthly saving, this target is not reached in this estimate.";
  }
  return `Estimated time to reach target: ${formatDuration(result.months)}`;
}

/**
 * How long a deposit target takes at a monthly saving (E32). Plain arithmetic from the engine:
 * no interest, no target suggested. Lives inside a ScenarioZone, so nothing here is saved.
 */
export const DepositTimeline: FC<DepositTimelineProps> = ({ values, onChange }) => (
  <SimulatorSplitLayout
    controls={
      <div className={timelineControls()}>
        <FormField label="Target amount">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              value={values.targetDeposit}
              onValueChange={(value) => onChange("targetDeposit", value)}
            />
          )}
        </FormField>
        <FormField label="Monthly saving">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              value={values.monthlySaving}
              onValueChange={(value) => onChange("monthlySaving", value)}
            />
          )}
        </FormField>
        <FormField hint="The total in your savings and investment accounts" label="Starting amount">
          {(field) => (
            <CurrencyInput
              {...controlProps(field)}
              min={0}
              value={values.startingAmount}
              onValueChange={(value) => onChange("startingAmount", value)}
            />
          )}
        </FormField>
      </div>
    }
    content={
      <div className={timelineOutcome()}>
        <p
          className={timelineResult()}
          data-testid="deposit-timeline-outcome"
          id="deposit-timeline-outcome"
        >
          {depositOutcomeText(values)}
        </p>
        <p className={timelineNote()}>
          This estimate does not include interest or changes in investment value.
        </p>
      </div>
    }
  />
);

export default DepositTimeline;
