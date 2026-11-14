import { monthsToTarget } from "@flump/finance-engine";
import { CurrencyInput, controlProps, FormField, SimulatorSplitLayout } from "@repo/ui";
import type { FC } from "react";
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

const countFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const plural = (n: number, one: string, many: string) =>
  `${countFormat.format(n)} ${n === 1 ? one : many}`;

export const DEPOSIT_EMPTY_TEXT = "Enter a target deposit to see an estimate.";

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
  const { months } = result;
  const split =
    months >= 12
      ? ` (${plural(Math.floor(months / 12), "year", "years")} ${plural(months % 12, "month", "months")})`
      : "";
  return `Estimated time to reach target: ${plural(months, "month", "months")}${split}`;
}

/**
 * How long a deposit target takes at a monthly saving (E32). Plain arithmetic from the engine:
 * no interest, no target suggested. Lives inside a ScenarioZone, so nothing here is saved.
 */
export const DepositTimeline: FC<DepositTimelineProps> = ({ values, onChange }) => (
  <SimulatorSplitLayout
    controls={
      <div className={timelineControls()}>
        <FormField label="Target deposit">
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
        <FormField hint="From your saved savings accounts" label="Starting amount">
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
        <p className={timelineNote()}>Estimate only. Does not include interest.</p>
      </div>
    }
  />
);

export default DepositTimeline;
