import { monthsToTarget } from "@flump/finance-engine";
import { formatMoney, niceStep, SimulatorSplitLayout, SliderField } from "@repo/ui";
import type { FC } from "react";
import { formatDuration } from "../SavingsForecast/savingsForecast.utils";
import {
  timelineControls,
  timelineLabel,
  timelineNote,
  timelineOutcome,
  timelineSupport,
  timelineSupportItem,
  timelineValue,
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
  /**
   * The saved figures the tool opened with. They set the slider ranges, so a range never moves
   * while an input is dragged. Defaults to the current values.
   */
  saved?: DepositTimelineValues;
  /** "Today", for the "Reached by" month. Defaults to now. */
  today?: Date;
}

export const DEPOSIT_EMPTY_TEXT = "Enter a target amount to see an estimate.";

/**
 * The target the tool opens with: the next round £1,000 above the starting amount. An
 * illustration so the tab never opens empty, never a suggested goal.
 */
export const defaultDepositTarget = (startingAmount: number | null): number =>
  (Math.floor(Math.max(0, startingAmount ?? 0) / 1000) + 1) * 1000;

/** A round slider top at least `value`, never below `floor`. */
const roundUp = (value: number, floor: number): number => {
  const top = Math.max(floor, value);
  const step = niceStep(top / 4);
  return Math.ceil(top / step) * step;
};

/** Slider ranges from the saved figures, so dragging never moves them. */
export const depositRanges = (saved: DepositTimelineValues) => {
  const start = Math.max(0, saved.startingAmount ?? 0);
  const target = Math.max(0, saved.targetDeposit ?? defaultDepositTarget(start));
  const monthly = Math.max(0, saved.monthlySaving ?? 0);
  const targetMax = roundUp(Math.max(target * 2, start * 2), 20_000);
  const startingMax = roundUp(start * 2, 10_000);
  const monthlyMax = roundUp(monthly * 2, 2_000);
  return {
    target: { max: targetMax, step: niceStep(targetMax / 200) },
    starting: { max: startingMax, step: niceStep(startingMax / 200) },
    monthly: { max: monthlyMax, step: monthlyMax > 2_000 ? niceStep(monthlyMax / 100) : 25 },
  };
};

type DepositOutcome =
  | { kind: "empty" }
  | { kind: "reached" }
  | { kind: "not-reachable" }
  | { kind: "months"; months: number; target: number; stillToSave: number };

const outcomeOf = (values: DepositTimelineValues): DepositOutcome => {
  if (values.targetDeposit === null || !(values.targetDeposit > 0)) return { kind: "empty" };
  const starting = values.startingAmount ?? 0;
  const result = monthsToTarget({
    target: values.targetDeposit,
    starting,
    monthly: values.monthlySaving ?? 0,
  });
  if (result.status === "reached") return { kind: "reached" };
  if (result.status === "not-reachable") return { kind: "not-reachable" };
  return {
    kind: "months",
    months: result.months,
    target: values.targetDeposit,
    stillToSave: values.targetDeposit - starting,
  };
};

/** The one outcome line for the current inputs (also the zone's announcement). */
export function depositOutcomeText(values: DepositTimelineValues): string {
  const outcome = outcomeOf(values);
  if (outcome.kind === "empty") return DEPOSIT_EMPTY_TEXT;
  if (outcome.kind === "reached") return "Your starting amount already meets this target.";
  if (outcome.kind === "not-reachable") {
    return "With no monthly saving, this target is not reached in this estimate.";
  }
  return `Estimated time to reach target: ${formatDuration(outcome.months)}`;
}

const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

/** The month a target is met, `months` whole months after `today`: "May 2027". */
export const reachedByMonth = (today: Date, months: number): string =>
  monthYear.format(new Date(today.getFullYear(), today.getMonth() + months, 1));

const money = (n: number) => formatMoney(n, { fractionDigits: 0 }).text;

/**
 * How long a target takes at a monthly saving (E32, R2-8): three sliders like "How it could
 * grow", one outcome (the time) and two supporting figures. Plain arithmetic from the engine: no
 * interest. Lives inside a ScenarioZone, so nothing here is saved.
 */
export const DepositTimeline: FC<DepositTimelineProps> = ({
  values,
  onChange,
  saved = values,
  today = new Date(),
}) => {
  const ranges = depositRanges(saved);
  const outcome = outcomeOf(values);

  return (
    <SimulatorSplitLayout
      controls={
        <div className={timelineControls()}>
          <SliderField
            format="currency"
            label="Target amount"
            max={ranges.target.max}
            min={0}
            step={ranges.target.step}
            value={values.targetDeposit}
            onChange={(value) => onChange("targetDeposit", value)}
            onClear={() => onChange("targetDeposit", null)}
          />
          <SliderField
            format="currency"
            label="Monthly saving"
            max={ranges.monthly.max}
            min={0}
            step={ranges.monthly.step}
            value={values.monthlySaving}
            onChange={(value) => onChange("monthlySaving", value)}
            onClear={() => onChange("monthlySaving", null)}
          />
          <SliderField
            format="currency"
            label="Starting amount"
            max={ranges.starting.max}
            min={0}
            step={ranges.starting.step}
            value={values.startingAmount}
            onChange={(value) => onChange("startingAmount", value)}
            onClear={() => onChange("startingAmount", null)}
          />
        </div>
      }
      controlsSpan={4}
      content={
        <div className={timelineOutcome()}>
          {outcome.kind === "months" ? (
            <>
              <p className={timelineLabel()}>Estimated time to reach {money(outcome.target)}</p>
              <p
                className={timelineValue()}
                data-testid="deposit-timeline-outcome"
                id="deposit-timeline-outcome"
              >
                {formatDuration(outcome.months)}
              </p>
              <dl className={timelineSupport()}>
                <div className={timelineSupportItem()}>
                  <dt>Reached by</dt>
                  <dd>{reachedByMonth(today, outcome.months)}</dd>
                </div>
                <div className={timelineSupportItem()}>
                  <dt>Still to save</dt>
                  <dd>{money(outcome.stillToSave)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p
              className={timelineLabel()}
              data-testid="deposit-timeline-outcome"
              id="deposit-timeline-outcome"
            >
              {depositOutcomeText(values)}
            </p>
          )}
          <p className={timelineNote()}>
            This estimate does not include interest or changes in investment value.
          </p>
        </div>
      }
    />
  );
};

export default DepositTimeline;
