import { Check } from "lucide-react";
import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import {
  stepperCompact,
  stepperCompactCount,
  stepperCompactName,
  stepperItem,
  stepperLabel,
  stepperList,
  stepperMarker,
  stepperRoot,
  stepperSegment,
  stepperSegments,
  stepperStatus,
  stepperTarget,
  stepperText,
} from "./Stepper.styles";

export type StepState = "complete" | "current" | "upcoming";

/**
 * A state a caller can give a step other than the current one. `skipped` reads "Skipped" and is
 * drawn like an upcoming step, so a step the user passed without finishing is never shown as done.
 */
export type StepStateOverride = "complete" | "upcoming" | "skipped";

type DisplayState = StepState | "skipped";

export interface StepperStep {
  id: string;
  /** Short step name, for example "Housing and outgoings". */
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  /** The current step, counting from 1. Earlier steps are complete, later ones upcoming. */
  current: number;
  /**
   * Optional per-step overrides, keyed by step id, for flows that can be done out of order. Steps
   * not listed keep the default (earlier complete, later upcoming). The current step is always
   * current; an override for it is ignored.
   */
  states?: Partial<Record<string, StepStateOverride>>;
  /** Accessible name for the step list. Defaults to "Setup progress". */
  label?: string;
  /**
   * When given, every step other than the current one is a button that calls this with the
   * step's number (counting from 1), so the stepper itself is the way to jump between steps.
   */
  onStepSelect?: (step: number) => void;
  className?: string;
}

const statusWords: Record<DisplayState, string> = {
  complete: "Complete",
  current: "Current step",
  upcoming: "Up next",
  skipped: "Skipped",
};

/** The recipe variant a state is drawn with. */
const visualState = (state: DisplayState): StepState => (state === "skipped" ? "upcoming" : state);

export const Stepper: FC<StepperProps> = ({
  steps,
  current,
  states,
  label = "Setup progress",
  onStepSelect,
  className,
}) => {
  const total = steps.length;
  const currentIndex = Math.min(Math.max(Math.round(current), 1), Math.max(total, 1)) - 1;
  const stateOf = (index: number): DisplayState => {
    if (index === currentIndex) return "current";
    const override = states?.[steps[index]?.id ?? ""];
    if (override) return override;
    return index < currentIndex ? "complete" : "upcoming";
  };
  const currentStep = steps[currentIndex];

  return (
    <div className={cx(stepperRoot(), className)}>
      {/* Phone: a short summary replaces the full row (the row is display:none there). */}
      <div className={stepperCompact()} data-testid="stepper-summary">
        <p className={stepperCompactCount()}>
          Step {currentIndex + 1} of {total}
        </p>
        {currentStep ? <p className={stepperCompactName()}>{currentStep.label}</p> : null}
        <ul aria-hidden="true" className={stepperSegments()}>
          {steps.map((step, index) => (
            <li className={stepperSegment({ state: visualState(stateOf(index)) })} key={step.id} />
          ))}
        </ul>
      </div>
      <ol aria-label={label} className={stepperList()}>
        {steps.map((step, index) => {
          const state = stateOf(index);
          const visual = visualState(state);
          const content = (
            <>
              <span aria-hidden="true" className={stepperMarker({ state: visual })}>
                {state === "complete" ? <Icon icon={Check} size="md" /> : index + 1}
              </span>
              <span className={stepperText()}>
                <span className={stepperLabel({ state: visual })} data-step-label="">
                  <VisuallyHidden>{`Step ${index + 1} of ${total}: `}</VisuallyHidden>
                  {step.label}
                </span>
                <span className={stepperStatus()}>{statusWords[state]}</span>
              </span>
            </>
          );
          return (
            <li
              aria-current={state === "current" ? "step" : undefined}
              className={stepperItem()}
              data-state={state}
              key={step.id}
            >
              {onStepSelect && state !== "current" ? (
                <button
                  className={stepperTarget({ interactive: true })}
                  onClick={() => onStepSelect(index + 1)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <span className={stepperTarget()}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Stepper;
